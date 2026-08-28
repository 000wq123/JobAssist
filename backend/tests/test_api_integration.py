from pathlib import Path

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes import auth, job_alerts, settings as settings_routes
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
from app.models.job_alert import JobAlert
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.user_profile import UserProfile


@pytest_asyncio.fixture
async def integration_env(tmp_path, monkeypatch):
    db_path = tmp_path / "integration.db"
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
    app.include_router(settings_routes.router, prefix="/api/settings", tags=["Settings"])
    app.include_router(job_alerts.router, prefix="/api/job-alerts", tags=["Job Alerts"])
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[security.get_db] = override_get_db

    monkeypatch.setattr(auth, "send_verification_email", lambda email, token: None)
    monkeypatch.setattr(auth, "send_password_reset_email", lambda email, token: None)
    monkeypatch.setattr(job_alerts, "_run_and_send", lambda *args, **kwargs: None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield {
            "client": client,
            "session_factory": session_factory,
        }

    await engine.dispose()


async def _register_user(client: AsyncClient, email="user@gmail.com", password="Password1"):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Integration User",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _auth_headers(client: AsyncClient, email="user@gmail.com", password="Password1"):
    tokens = await _register_user(client, email=email, password=password)
    return {"Authorization": f"Bearer {tokens['access_token']}"}, tokens


@pytest.mark.asyncio
async def test_auth_register_verify_refresh_and_delete_account_integration(integration_env):
    client = integration_env["client"]
    session_factory = integration_env["session_factory"]

    tokens = await _register_user(client)

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "user@gmail.com"))).scalar_one()
        assert user.is_verified is False
        verify_token = auth._create_email_token(user.id, "verify", expires_minutes=30)

    verify_response = await client.post("/api/auth/verify-email", json={"token": verify_token})
    assert verify_response.status_code == 200, verify_response.text

    me_response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["is_verified"] is True

    refresh_response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_response.status_code == 200, refresh_response.text
    refreshed = refresh_response.json()
    assert refreshed["access_token"]
    # Refresh is intentionally non-rotating: the same refresh token stays
    # valid so parallel tabs don't invalidate each other (multi-tab fix).
    assert refreshed["refresh_token"] == tokens["refresh_token"]

    delete_response = await client.post(
        "/api/auth/delete-account",
        json={"password": "Password1"},
        headers={"Authorization": f"Bearer {refreshed['access_token']}"},
    )
    assert delete_response.status_code == 200, delete_response.text

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "user@gmail.com"))).scalar_one_or_none()
        refresh_tokens = (await session.execute(select(RefreshToken))).scalars().all()
        assert user is None
        assert refresh_tokens == []


@pytest.mark.asyncio
async def test_auth_refresh_and_resend_negative_paths_integration(integration_env):
    client = integration_env["client"]
    session_factory = integration_env["session_factory"]

    tokens = await _register_user(client, email="negative-auth@gmail.com")

    # The register response set a valid refresh cookie. Clear it so the body
    # token is the only credential the backend sees — otherwise the cookie
    # (which is valid) would take precedence and the request would succeed.
    client.cookies.clear()
    bad_refresh = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": "not-a-real-token"},
    )
    assert bad_refresh.status_code == 401
    assert bad_refresh.json()["detail"] == "Invalid or expired refresh token"

    resend_public = await client.post(
        "/api/auth/resend-verification-public",
        json={"email": "negative-auth@gmail.com"},
    )
    assert resend_public.status_code == 200
    assert "unverifiziertes Konto" in resend_public.json()["message"]

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "negative-auth@gmail.com"))).scalar_one()
        verify_token = auth._create_email_token(user.id, "verify", expires_minutes=30)

    verify_response = await client.post("/api/auth/verify-email", json={"token": verify_token})
    assert verify_response.status_code == 200

    resend_after_verify = await client.post(
        "/api/auth/resend-verification",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resend_after_verify.status_code == 200
    assert resend_after_verify.json()["message"] == "E-Mail bereits bestätigt"


@pytest.mark.asyncio
async def test_settings_profile_and_preferences_persist_integration(integration_env):
    client = integration_env["client"]
    session_factory = integration_env["session_factory"]
    headers, _tokens = await _auth_headers(client, email="settings@gmail.com")

    profile_response = await client.put(
        "/api/settings/profile",
        headers=headers,
        json={
            "desired_locations": ["Wien", "Remote"],
            "salary_min": 50,
            "salary_max": 80,
            "job_types": ["Full-time"],
            "industries": ["Tech"],
            "experience_level": "Senior",
            "is_open_to_relocation": True,
        },
    )
    assert profile_response.status_code == 200, profile_response.text

    preferences_response = await client.put(
        "/api/settings/preferences",
        headers=headers,
        json={
            "currency": "EUR",
            "location": "Austria",
            "language": "de",
        },
    )
    assert preferences_response.status_code == 200, preferences_response.text

    get_profile = await client.get("/api/settings/profile", headers=headers)
    get_preferences = await client.get("/api/settings/preferences", headers=headers)
    assert get_profile.status_code == 200
    assert get_preferences.status_code == 200
    assert get_profile.json()["desired_locations"] == ["Wien", "Remote"]
    assert get_preferences.json()["currency"] == "EUR"
    assert get_preferences.json()["language"] == "de"

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "settings@gmail.com"))).scalar_one()
        profile = (await session.execute(select(UserProfile).where(UserProfile.user_id == user.id))).scalar_one()
        assert user.location == "Austria"
        assert profile.salary_min == 50
        assert profile.salary_max == 80


@pytest.mark.asyncio
async def test_settings_validation_failures_integration(integration_env):
    client = integration_env["client"]
    headers, _tokens = await _auth_headers(client, email="invalid-settings@gmail.com")

    bad_profile = await client.put(
        "/api/settings/profile",
        headers=headers,
        json={
            "salary_min": 90,
            "salary_max": 80,
        },
    )
    assert bad_profile.status_code == 422
    assert "Mindestgehalt" in bad_profile.text

    bad_preferences = await client.put(
        "/api/settings/preferences",
        headers=headers,
        json={
            "currency": "EURO",
            "language": "fr",
        },
    )
    assert bad_preferences.status_code == 422
    assert "Währung" in bad_preferences.text or "Sprache" in bad_preferences.text


@pytest.mark.asyncio
async def test_job_alert_lifecycle_and_refresh_tracking_integration(integration_env):
    client = integration_env["client"]
    session_factory = integration_env["session_factory"]
    headers, _tokens = await _auth_headers(client, email="alerts@gmail.com")

    create_response = await client.post(
        "/api/job-alerts/",
        headers=headers,
        json={
            "keywords": "python",
            "location": "Wien",
            "job_type": "Full-time",
            "email": "ignored@example.com",
            "frequency": "daily",
        },
    )
    assert create_response.status_code == 201, create_response.text
    created_alert = create_response.json()
    assert created_alert["email"] == "alerts@gmail.com"

    patch_response = await client.patch(
        f"/api/job-alerts/{created_alert['id']}",
        headers=headers,
        json={"is_active": False},
    )
    assert patch_response.status_code == 200, patch_response.text
    assert patch_response.json()["is_active"] is False

    run_response = await client.post(
        f"/api/job-alerts/{created_alert['id']}/run",
        headers=headers,
    )
    assert run_response.status_code == 200, run_response.text
    run_payload = run_response.json()
    assert run_payload["runs_used"] == 1
    assert run_payload["runs_remaining"] == -1  # JobAssist is free — unlimited manual runs

    list_response = await client.get("/api/job-alerts/", headers=headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed["alerts"]) == 1

    delete_response = await client.delete(f"/api/job-alerts/{created_alert['id']}", headers=headers)
    assert delete_response.status_code == 204

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "alerts@gmail.com"))).scalar_one()
        remaining_alerts = (await session.execute(select(JobAlert).where(JobAlert.user_id == user.id))).scalars().all()
        assert user.daily_manual_run_count == 1
        assert remaining_alerts == []


@pytest.mark.asyncio
async def test_job_alert_rewrite_cooldown_and_manual_limit_integration(integration_env):
    client = integration_env["client"]
    headers, _tokens = await _auth_headers(client, email="cooldowns@gmail.com")

    create_response = await client.post(
        "/api/job-alerts/",
        headers=headers,
        json={
            "keywords": "python",
            "location": "Wien",
            "job_type": "Full-time",
            "email": "ignored@example.com",
            "frequency": "daily",
        },
    )
    assert create_response.status_code == 201, create_response.text
    alert_id = create_response.json()["id"]

    cooldown_response = await client.patch(
        f"/api/job-alerts/{alert_id}",
        headers=headers,
        json={"keywords": "golang"},
    )
    assert cooldown_response.status_code == 429
    assert "bearbeiten" in cooldown_response.json()["detail"]

    # Manual runs are unlimited now (JobAssist is free): the 4th run must
    # succeed instead of hitting the old daily cap.
    for expected_used in (1, 2, 3, 4):
        run_response = await client.post(f"/api/job-alerts/{alert_id}/run", headers=headers)
        assert run_response.status_code == 200, run_response.text
        assert run_response.json()["runs_used"] == expected_used
        assert run_response.json()["runs_remaining"] == -1
