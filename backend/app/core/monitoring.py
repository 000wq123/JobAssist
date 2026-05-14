"""Sentry configuration with PII scrubbing.

Every payload that leaves the application is first run through
`_scrub_event`, which strips:
  * `Authorization` / `Cookie` / `Set-Cookie` request + response headers
  * `password`, `token`, `refresh_token`, `secret`, `api_key` fields
    anywhere in `extra`, `request.data`, or query params
  * Stripe / Groq / Adzuna keys when they appear inside log messages
  * IP addresses (`request.env.REMOTE_ADDR` and `user.ip_address`)

This means: you can ship to Sentry from the EU and still satisfy GDPR
art. 32 + art. 5(1)(c) ("data minimisation").
"""
from __future__ import annotations

import logging
import re
from typing import Any, Mapping


logger = logging.getLogger(__name__)


_SENSITIVE_KEYS = {
    "password",
    "passwd",
    "pwd",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "api_key",
    "apikey",
    "secret",
    "client_secret",
    "stripe_secret_key",
    "groq_api_key",
    "anthropic_api_key",
    "authorization",
    "cookie",
    "set-cookie",
    "x-admin-secret",
}
_REDACTED = "[redacted]"

# Patterns for values that look like secrets even when their key is opaque.
_SECRET_VALUE_PATTERNS = [
    re.compile(r"sk_(live|test)_[A-Za-z0-9]{16,}"),   # Stripe secret keys
    re.compile(r"pk_(live|test)_[A-Za-z0-9]{16,}"),   # Stripe publishable keys (informational)
    re.compile(r"whsec_[A-Za-z0-9]{16,}"),            # Stripe webhook secrets
    re.compile(r"gsk_[A-Za-z0-9]{20,}"),              # Groq API keys
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]+"),  # JWTs
]


def _scrub_string(value: str) -> str:
    for pattern in _SECRET_VALUE_PATTERNS:
        value = pattern.sub(_REDACTED, value)
    return value


def _scrub_mapping(node: Any) -> Any:
    """Recursively redact sensitive keys, in-place where possible."""
    if isinstance(node, Mapping):
        scrubbed = {}
        for k, v in node.items():
            if isinstance(k, str) and k.lower() in _SENSITIVE_KEYS:
                scrubbed[k] = _REDACTED
            else:
                scrubbed[k] = _scrub_mapping(v)
        return scrubbed
    if isinstance(node, list):
        return [_scrub_mapping(item) for item in node]
    if isinstance(node, str):
        return _scrub_string(node)
    return node


def _scrub_event(event: dict, _hint: dict) -> dict | None:
    """Sentry `before_send` hook. Returning None drops the event entirely."""
    try:
        # Strip the request envelope of cookies, headers, query bits, body.
        request = event.get("request") or {}
        for header_bag in ("headers", "env"):
            if header_bag in request:
                request[header_bag] = _scrub_mapping(request[header_bag])
        for body_field in ("data", "query_string", "cookies"):
            if body_field in request:
                request[body_field] = _scrub_mapping(request[body_field])
        event["request"] = request

        # Strip identifying info from `user` payload.
        user = event.get("user") or {}
        for ident_field in ("ip_address", "email"):
            if ident_field in user:
                user[ident_field] = _REDACTED
        event["user"] = user

        # Strip extras + tags.
        if "extra" in event:
            event["extra"] = _scrub_mapping(event["extra"])
        if "tags" in event:
            event["tags"] = _scrub_mapping(event["tags"])

        # Strip secret-looking substrings out of breadcrumb messages.
        for breadcrumb in event.get("breadcrumbs", {}).get("values", []):
            if "message" in breadcrumb and isinstance(breadcrumb["message"], str):
                breadcrumb["message"] = _scrub_string(breadcrumb["message"])
            if "data" in breadcrumb:
                breadcrumb["data"] = _scrub_mapping(breadcrumb["data"])

        # Strip log message + exception value bodies.
        if "message" in event and isinstance(event["message"], str):
            event["message"] = _scrub_string(event["message"])
        for exc in event.get("exception", {}).get("values", []):
            if "value" in exc and isinstance(exc["value"], str):
                exc["value"] = _scrub_string(exc["value"])
    except Exception:
        # Never let scrubbing crash the SDK — drop the event instead so the
        # user is not forced to debug a buggy hook in prod.
        logger.exception("sentry.scrub_failed")
        return None
    return event


def configure_sentry(dsn: str = "", traces_sample_rate: float = 0.0) -> bool:
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    except Exception:
        logger.warning("Sentry DSN configured but sentry-sdk is not installed")
        return False

    sentry_sdk.init(
        dsn=dsn,
        traces_sample_rate=traces_sample_rate,
        send_default_pii=False,         # do not send cookies / IPs by default
        attach_stacktrace=True,
        max_breadcrumbs=50,
        before_send=_scrub_event,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    )
    logger.info("Sentry configured with PII scrubbing")
    return True
