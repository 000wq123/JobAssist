from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, Response

from app.api.routes import auth
from app.schemas.user import UserLogin


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None):
        self._scalar_one_or_none = scalar_one_or_none

    def scalar_one_or_none(self):
        return self._scalar_one_or_none


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
    assert result.refresh_token == "refresh-token"
    # Refresh token must be set as an httpOnly cookie
    set_cookie = response.headers.get("set-cookie", "")
    assert "ja_refresh=refresh-token" in set_cookie
    assert "HttpOnly" in set_cookie
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_refresh_revokes_old_token_and_returns_new_tokens(monkeypatch):
    refresh_row = SimpleNamespace(
        user_id=3,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        revoked=False,
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=refresh_row))

    monkeypatch.setattr(auth, "hash_refresh_token", lambda raw: "hashed-old")
    monkeypatch.setattr(auth, "generate_refresh_token", lambda: ("new-refresh", "new-hash"))
    monkeypatch.setattr(auth, "create_access_token", lambda payload: "new-access")

    response = Response()
    result = await auth.refresh(
        request=_request(),
        response=response,
        db=db,
        payload=auth.RefreshRequest(refresh_token="raw-refresh"),
    )

    assert refresh_row.revoked is True
    assert result.access_token == "new-access"
    assert result.refresh_token == "new-refresh"
    set_cookie = response.headers.get("set-cookie", "")
    assert "ja_refresh=new-refresh" in set_cookie
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


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
    assert db.execute.await_count == 8
    db.commit.assert_awaited_once()
