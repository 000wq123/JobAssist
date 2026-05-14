"""Unit tests for app.api.routes.billing webhook handlers and helpers.

Stripe calls and DB are mocked — no network or database required.
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.billing import (
    _get_price_id,
    _handle_checkout_completed,
    _handle_invoice_paid,
    _handle_payment_failed,
    _handle_subscription_deleted,
    _handle_subscription_updated,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

class FakeResult:
    def __init__(self, *, scalar_one_or_none=None):
        self._v = scalar_one_or_none

    def scalar_one_or_none(self):
        return self._v


# ---------------------------------------------------------------------------
# _get_price_id
# ---------------------------------------------------------------------------

def test_get_price_id_pro(monkeypatch):
    from app.core import config as cfg
    monkeypatch.setattr(cfg.settings, "STRIPE_PRICE_PRO", "price_pro_123", raising=False)
    assert _get_price_id("pro") == "price_pro_123"


def test_get_price_id_invalid_raises():
    with pytest.raises(HTTPException) as exc:
        _get_price_id("free")
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# _handle_checkout_completed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_checkout_completed_upgrades_plan():
    sub = SimpleNamespace(
        user_id=1,
        stripe_customer_id="cus_abc",
        stripe_subscription_id=None,
        plan="basic",
        status="active",
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=sub))

    session_data = {
        "customer": "cus_abc",
        "subscription": "sub_xyz",
        "metadata": {"plan": "pro"},
    }
    await _handle_checkout_completed(db, session_data)

    assert sub.plan == "pro"
    assert sub.stripe_subscription_id == "sub_xyz"
    assert sub.status == "active"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_checkout_completed_skips_unknown_customer():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))

    await _handle_checkout_completed(db, {"customer": "cus_unknown", "subscription": "s", "metadata": {}})

    # No subscription row mutated, but commit IS called so the upstream
    # idempotency-log row (ProcessedWebhookEvent) is persisted — otherwise
    # Stripe would keep retrying this event forever.
    db.commit.assert_awaited_once()
    db.add.assert_not_called()


# ---------------------------------------------------------------------------
# _handle_payment_failed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_payment_failed_sets_past_due():
    sub = SimpleNamespace(user_id=2, stripe_customer_id="cus_1", status="active")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=sub))

    await _handle_payment_failed(db, {"customer": "cus_1"})

    assert sub.status == "past_due"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_payment_failed_noop_for_unknown_customer():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))

    await _handle_payment_failed(db, {"customer": "cus_missing"})

    # Same rationale as the checkout case: commit to persist the idempotency
    # row, but no subscription field is mutated.
    db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# _handle_subscription_deleted
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subscription_deleted_downgrades_to_basic():
    sub = SimpleNamespace(
        user_id=3,
        plan="pro",
        status="active",
        stripe_subscription_id="sub_abc",
        stripe_customer_id="cus_3",
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=sub))

    await _handle_subscription_deleted(db, {"customer": "cus_3"})

    assert sub.plan == "basic"
    assert sub.status == "canceled"
    assert sub.stripe_subscription_id is None
    db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# _handle_subscription_updated
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subscription_updated_changes_plan_from_price_id(monkeypatch):
    from app.api.routes import billing as billing_mod

    sub = SimpleNamespace(
        user_id=4,
        plan="pro",
        status="active",
        current_period_end=None,
        stripe_customer_id="cus_4",
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=sub))

    # Inject price→plan mapping
    billing_mod.PRICE_TO_PLAN["price_max_456"] = "max"

    stripe_sub_data = {
        "customer": "cus_4",
        "status": "active",
        "current_period_end": int(datetime(2027, 1, 1, tzinfo=timezone.utc).timestamp()),
        "items": {"data": [{"price": {"id": "price_max_456"}}]},
    }
    await _handle_subscription_updated(db, stripe_sub_data)

    assert sub.plan == "max"
    assert sub.current_period_end is not None
    db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# _handle_invoice_paid
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invoice_paid_sets_status_active():
    sub = SimpleNamespace(
        user_id=5,
        stripe_customer_id="cus_5",
        status="past_due",
        current_period_end=None,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=sub))

    # No subscription ID in invoice — period end update is skipped
    await _handle_invoice_paid(db, {"customer": "cus_5", "subscription": None})

    assert sub.status == "active"
    db.commit.assert_awaited_once()
