"""Refresh-token cookie helpers.

Design:
- The refresh token is stored in an httpOnly + Secure cookie scoped to
  `/api/auth/*`. This makes it inaccessible to JavaScript (XSS-proof) and
  prevents it from being attached to non-auth requests, dramatically
  reducing the impact of any future CSRF vulnerability.
- The access token is still returned in the JSON response body and lives
  only in the SPA's tab-scoped sessionStorage-backed auth store. Bearer-header auth on every
  other endpoint is unchanged.

See `Settings` in `app.core.config` for cookie deployment modes.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Request, Response

from app.core.config import settings


def _max_age_seconds() -> int:
    return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _effective_secure() -> bool:
    """In DEBUG mode (local HTTP dev / tests) drop the Secure flag so the cookie
    is actually sent back. SameSite=None requires Secure=True per the spec, so
    when DEBUG is on we also downgrade SameSite to lax to keep browsers happy.
    """
    if settings.DEBUG:
        return False
    return settings.COOKIE_SECURE


def _effective_samesite() -> str:
    if settings.DEBUG and settings.COOKIE_SAMESITE.lower() == "none":
        return "lax"
    return settings.COOKIE_SAMESITE


def set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    """Attach a refresh-token cookie to the response."""
    kwargs: dict = {
        "key": settings.REFRESH_COOKIE_NAME,
        "value": raw_refresh_token,
        "max_age": _max_age_seconds(),
        "httponly": True,
        "secure": _effective_secure(),
        "samesite": _effective_samesite(),
        "path": settings.COOKIE_PATH,
    }
    if settings.COOKIE_DOMAIN:
        kwargs["domain"] = settings.COOKIE_DOMAIN
    response.set_cookie(**kwargs)


def clear_refresh_cookie(response: Response) -> None:
    """Delete the refresh-token cookie. Must use the same path/domain as set."""
    kwargs: dict = {
        "key": settings.REFRESH_COOKIE_NAME,
        "path": settings.COOKIE_PATH,
    }
    if settings.COOKIE_DOMAIN:
        kwargs["domain"] = settings.COOKIE_DOMAIN
    response.delete_cookie(**kwargs)


def read_refresh_cookie(request: Request) -> Optional[str]:
    """Read the raw refresh token from the cookie, if present."""
    return request.cookies.get(settings.REFRESH_COOKIE_NAME)
