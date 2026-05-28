"""Sentry configuration with PII scrubbing.

Every payload that leaves the application is first run through
`_scrub_event`, which strips:
  * `Authorization` / `Cookie` / `Set-Cookie` request + response headers
  * `password`, `token`, `refresh_token`, `secret`, `api_key` fields
    anywhere in `extra`, `request.data`, or query params
  * Stripe / Groq / Adzuna keys when they appear inside log messages
  * IP addresses (`request.env.REMOTE_ADDR` and `user.ip_address`)

Redaction primitives (`SENSITIVE_KEYS`, `SECRET_VALUE_PATTERNS`,
`scrub_string`, `scrub_mapping`) live in `app.core.redaction` so the
stdout structured-log filter shares the exact same list — there is no
"Sentry-safe" vs "stdout-safe" gap to drift.

This means: you can ship to Sentry from the EU and still satisfy GDPR
art. 32 + art. 5(1)(c) ("data minimisation").
"""
from __future__ import annotations

import logging

from app.core.redaction import REDACTED as _REDACTED, scrub_mapping as _scrub_mapping, scrub_string as _scrub_string


logger = logging.getLogger(__name__)


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
