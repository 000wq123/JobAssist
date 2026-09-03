"""Integration tests for Stripe webhook handlers.

All Stripe API calls are mocked; only the DB logic is exercised against a
real SQLite database to verify subscription state transitions.
"""
from unittest.mock import patch

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes import auth, billing
from app.core import security
from app.core.database import Base, get_db
from app.models import job as _job_model  # noqa: F401
from app.models import job_alert as _job_alert_model  # noqa: F401
from app.models import refresh_token as _refresh_token_model  # noqa: F401
from app.models import resume as _resume_model  # noqa: F401
from app.models import subscription as _subscription_model  # noqa: F401
from app.models import usage as _usage_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.models import user_profile as _user_profile_model  # noqa: F401
from app.models.subscription import Subscription
from app.models.user import User


@pytest_asyncio.fixture
async def billing_env(tmp_path, monkeypatch):
    db_path = tmp_path / "billing_integration.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app = FastAPI()
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[security.get_db] = override_get_db

    monkeypatch.setattr(auth, "send_verification_email", lambda email, token: None)
    monkeypatch.setattr(auth, "send_password_reset_email", lambda email, token: None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield {"client": client, "session_factory": session_factory}

    await engine.dispose()


async def _seed_subscription(session_factory, user_id: int, customer_id: str, plan: str = "basic"):
    """Insert a Subscription row for a given user."""
    async with session_factory() as session:
        sub = Subscription(
            user_id=user_id,
            stripe_customer_id=customer_id,
            plan=plan,
            status="active",
        )
        session.add(sub)
        await session.commit()


async def _register(client: AsyncClient, email="billing@gmail.com"):
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password1", "full_name": "Test"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _fake_event(event_type: str, data: dict) -> dict:
    # `id` is required by the idempotency guard in stripe_webhook(). Use a
    # uuid so each test gets a unique row in processed_webhook_events.
    import uuid

    return {"id": f"evt_{uuid.uuid4().hex}", "type": event_type, "data": {"object": data}}


async def _post_webhook(client: AsyncClient, event_type: str, data: dict):
    fake_event = _fake_event(event_type, data)
    with patch("app.api.routes.billing.stripe.Webhook.construct_event", return_value=fake_event), \
         patch("app.api.routes.billing.stripe.api_key", "sk_test_fake"):
        return await client.post(
            "/api/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=fake"},
        )


# ---------------------------------------------------------------------------
# checkout.session.completed → upgrades plan to "pro"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_checkout_completed_upgrades_plan(billing_env):
    client = billing_env["client"]
    session_factory = billing_env["session_factory"]

    await _register(client)
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "billing@gmail.com"))).scalar_one()

    await _seed_subscription(session_factory, user.id, "cus_test_123")

    resp = await _post_webhook(client, "checkout.session.completed", {
        "customer": "cus_test_123",
        "subscription": "sub_test_456",
        "metadata": {"plan": "pro", "user_id": str(user.id)},
    })
    assert resp.status_code == 200, resp.text

    async with session_factory() as session:
        sub = (await session.execute(
            select(Subscription).where(Subscription.stripe_customer_id == "cus_test_123")
        )).scalar_one()
        assert sub.plan == "pro"
        assert sub.status == "active"
        assert sub.stripe_subscription_id == "sub_test_456"


# ---------------------------------------------------------------------------
# invoice.payment_failed → marks subscription as past_due
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_payment_failed_marks_past_due(billing_env):
    client = billing_env["client"]
    session_factory = billing_env["session_factory"]

    await _register(client, email="payfail@gmail.com")
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "payfail@gmail.com"))).scalar_one()

    await _seed_subscription(session_factory, user.id, "cus_fail_789", plan="pro")

    resp = await _post_webhook(client, "invoice.payment_failed", {
        "customer": "cus_fail_789",
        "subscription": "sub_fail_789",
    })
    assert resp.status_code == 200, resp.text

    async with session_factory() as session:
        sub = (await session.execute(
            select(Subscription).where(Subscription.stripe_customer_id == "cus_fail_789")
        )).scalar_one()
        assert sub.status == "past_due"
        assert sub.plan == "pro"


# ---------------------------------------------------------------------------
# customer.subscription.deleted → resets plan to "basic" and status "canceled"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_subscription_deleted_resets_to_basic(billing_env):
    client = billing_env["client"]
    session_factory = billing_env["session_factory"]

    await _register(client, email="deleted@gmail.com")
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "deleted@gmail.com"))).scalar_one()

    await _seed_subscription(session_factory, user.id, "cus_del_111", plan="max")

    resp = await _post_webhook(client, "customer.subscription.deleted", {
        "customer": "cus_del_111",
        "id": "sub_del_111",
    })
    assert resp.status_code == 200, resp.text

    async with session_factory() as session:
        sub = (await session.execute(
            select(Subscription).where(Subscription.stripe_customer_id == "cus_del_111")
        )).scalar_one()
        assert sub.plan == "basic"
        assert sub.status == "canceled"
        assert sub.stripe_subscription_id is None


# ---------------------------------------------------------------------------
# Unknown customer ID → graceful no-op (no 500)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_unknown_customer_is_noop(billing_env):
    client = billing_env["client"]

    resp = await _post_webhook(client, "checkout.session.completed", {
        "customer": "cus_nonexistent",
        "subscription": "sub_nope",
        "metadata": {"plan": "pro"},
    })
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# Invalid signature → 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_400(billing_env):
    client = billing_env["client"]

    with patch(
        "app.api.routes.billing.stripe.Webhook.construct_event",
        side_effect=ValueError("Invalid signature"),
    ):
        resp = await client.post(
            "/api/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=bad"},
        )

    assert resp.status_code == 400
