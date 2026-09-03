from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, Response

from app.api.routes import auth
from app.core import security
from app.core.user_data import DELETE_USER_DATA_MODELS
from app.schemas.user import UserLogin


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, scalars=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._scalars = scalars or []

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalars(self):
        return SimpleNamespace(all=lambda: list(self._scalars))


def _request(cookies: dict | None = None) -> SimpleNamespace:
    """Build a request stub the cookie helpers can read from."""
    return SimpleNamespace(cookies=cookies or {})


@pytest.mark.asyncio
async def test_login_allows_unverified_user(monkeypatch):
    user = SimpleNamespace(
        id=12,
        email="user@example.com",
        hashed_password="hashed",
        is_active=True,
        is_verified=False,
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))

    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: True)
    monkeypatch.setattr(auth, "create_access_token", lambda payload: "access-token")
    monkeypatch.setattr(auth, "generate_refresh_token", lambda: ("refresh-token", "refresh-hash"))

    response = Response()
    result = await auth.login(
        request=_request(),
        response=response,
        payload=UserLogin(email="user@example.com", password="Password1"),
        db=db,
    )

    assert result.access_token == "access-token"
    assert not hasattr(result, "refresh_token")
    # Refresh token must be set as an httpOnly cookie
    set_cookie = response.headers.get("set-cookie", "")
    assert "ja_refresh=refresh-token" in set_cookie
    assert "HttpOnly" in set_cookie
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_refresh_returns_new_access_token_keeping_refresh_token(monkeypatch):
    """Non-rotating refresh: returns a new access token but keeps the same
    refresh token. This is idempotent and concurrent-safe — multi-tab races
    (where one tab rotates the token and another tab's in-flight request gets
    rejected as revoked) cannot happen."""
    refresh_row = SimpleNamespace(
        user_id=3,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        revoked=False,
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=refresh_row))

    monkeypatch.setattr(auth, "hash_refresh_token", lambda raw: "hashed-old")
    monkeypatch.setattr(auth, "create_access_token", lambda payload: "new-access")

    response = Response()
    result = await auth.refresh(
        request=_request(),
        response=response,
        db=db,
        payload=auth.RefreshRequest(refresh_token="raw-refresh"),
    )

    # Token must NOT be revoked — no rotation.
    assert refresh_row.revoked is False
    assert result.access_token == "new-access"
    # The raw refresh credential is never exposed to JavaScript.
    assert not hasattr(result, "refresh_token")
    # No new cookie set — the existing one is still valid.
    assert "ja_refresh" not in (response.headers.get("set-cookie") or "")
    # No new row added to the DB.
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_refresh_revokes_token_when_user_row_is_gone(monkeypatch):
    """A refresh token whose user was deleted (DB swap/restore) must be revoked
    and rejected — minting an access token for a missing user makes the SPA
    loop on 401 forever (token passes signature checks but get_current_user
    rejects it).
    """
    refresh_row = SimpleNamespace(
        user_id=3,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        revoked=False,
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=refresh_row))
    # The user row no longer exists.
    db.get = AsyncMock(return_value=None)

    monkeypatch.setattr(auth, "hash_refresh_token", lambda raw: "hashed-old")
    monkeypatch.setattr(auth, "create_access_token", lambda payload: "should-not-mint")

    response = Response()
    with pytest.raises(HTTPException) as exc:
        await auth.refresh(
            request=_request(),
            response=response,
            db=db,
            payload=auth.RefreshRequest(refresh_token="raw-refresh"),
        )

    assert exc.value.status_code == 401
    # Token is revoked so it can't keep minting new access tokens.
    assert refresh_row.revoked is True
    db.commit.assert_awaited_once()
    # Cookie cleared so the SPA falls back to /login instead of looping.
    assert "ja_refresh" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_refresh_rejects_expired_tokens(monkeypatch):
    refresh_row = SimpleNamespace(
        user_id=3,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        revoked=False,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=refresh_row))

    monkeypatch.setattr(auth, "hash_refresh_token", lambda raw: "hashed-old")

    response = Response()
    with pytest.raises(HTTPException) as exc:
        await auth.refresh(
            request=_request(),
            response=response,
            db=db,
            payload=auth.RefreshRequest(refresh_token="raw-refresh"),
        )

    assert exc.value.status_code == 401
    # Expired-token rejection clears the cookie so the SPA redirects to /login
    assert "ja_refresh" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_verify_email_marks_user_verified(monkeypatch):
    user = SimpleNamespace(id=7, is_verified=False)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))

    monkeypatch.setattr(auth, "_decode_email_token", lambda token, purpose: 7)

    result = await auth.verify_email(
        request=_request(),
        payload=auth.VerifyEmailRequest(token="email-token"),
        db=db,
    )

    assert user.is_verified is True
    assert result["message"] == "E-Mail erfolgreich bestätigt"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("purpose", ["verify", "reset"])
async def test_email_action_token_cannot_authenticate_as_bearer(purpose):
    token = auth._create_email_token(7, purpose, expires_minutes=30)
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await security.get_current_user(token=token, db=db)

    assert exc.value.status_code == 401
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_access_token_requires_current_auth_version():
    user = SimpleNamespace(id=7, auth_version=2)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))
    stale = security.create_access_token({"sub": "7", "auth_version": 1})

    with pytest.raises(HTTPException) as exc:
        await security.get_current_user(token=stale, db=db)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_token_is_single_use(monkeypatch):
    nonce = "reset-nonce"
    user = SimpleNamespace(
        id=7,
        password_reset_nonce=nonce,
        auth_version=0,
        hashed_password="old",
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))
    monkeypatch.setattr(auth, "hash_password", lambda value: f"hashed:{value}")
    token = auth._create_email_token(
        user.id,
        "reset",
        expires_minutes=30,
        nonce=nonce,
    )
    payload = auth.ResetPasswordRequest(token=token, new_password="NewPassword1")

    result = await auth.reset_password(request=_request(), payload=payload, db=db)

    assert result["message"] == "Passwort erfolgreich zurückgesetzt"
    assert user.password_reset_nonce is None
    assert user.auth_version == 1
    assert user.hashed_password == "hashed:NewPassword1"

    with pytest.raises(HTTPException) as exc:
        await auth.reset_password(request=_request(), payload=payload, db=db)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_resend_verification_public_sends_only_for_unverified_user(monkeypatch):
    user = SimpleNamespace(id=8, email="user@example.com", is_verified=False)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))
    bg = SimpleNamespace(add_task=MagicMock())

    monkeypatch.setattr(auth, "_create_email_token", lambda user_id, purpose, expires_minutes: "verify-token")

    result = await auth.resend_verification_public(
        request=_request(),
        payload=auth.ForgotPasswordRequest(email="user@example.com"),
        bg=bg,
        db=db,
    )

    assert result["message"] == "Falls ein unverifiziertes Konto mit dieser E-Mail existiert, wurde eine Bestätigungs-E-Mail gesendet"
    bg.add_task.assert_called_once()


@pytest.mark.asyncio
async def test_resend_verification_public_skips_verified_user(monkeypatch):
    user = SimpleNamespace(id=8, email="user@example.com", is_verified=True)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=user))
    bg = SimpleNamespace(add_task=MagicMock())

    result = await auth.resend_verification_public(
        request=_request(),
        payload=auth.ForgotPasswordRequest(email="user@example.com"),
        bg=bg,
        db=db,
    )

    assert result["message"] == "Falls ein unverifiziertes Konto mit dieser E-Mail existiert, wurde eine Bestätigungs-E-Mail gesendet"
    bg.add_task.assert_not_called()


@pytest.mark.asyncio
async def test_delete_account_rejects_wrong_password(monkeypatch):
    current_user = SimpleNamespace(id=3, hashed_password="hashed")
    db = AsyncMock()

    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: False)

    with pytest.raises(HTTPException) as exc:
        await auth.delete_account(
            request=_request(),
            payload=auth.DeleteAccountRequest(password="wrong"),
            current_user=current_user,
            db=db,
        )

    assert exc.value.status_code == 400
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_delete_account_deletes_all_related_records(monkeypatch):
    current_user = SimpleNamespace(id=3, hashed_password="hashed")
    db = AsyncMock()

    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: True)

    result = await auth.delete_account(
        request=_request(),
        payload=auth.DeleteAccountRequest(password="Password1"),
        current_user=current_user,
        db=db,
    )

    assert result["message"] == "Konto und alle Daten wurden gelöscht"
    assert db.execute.await_count == len(DELETE_USER_DATA_MODELS) + 1
    db.commit.assert_awaited_once()
