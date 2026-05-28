"""Shared PII / secret redaction primitives.

This module is the single source of truth for what counts as "sensitive"
in this codebase. Both the Sentry `before_send` hook (`app.core.monitoring`)
and the stdout structured-log filter (`app.core.logging`) import from
here so we never have two lists drifting apart.

Design notes:
- `SENSITIVE_KEYS` is matched case-insensitively against dict keys.
- `SECRET_VALUE_PATTERNS` matches the *value* even when the key is opaque
  (e.g. when a third-party SDK logs a raw line containing a Stripe key).
- `scrub_mapping` is non-destructive and recursive over `dict | list`,
  but it walks objects only one level beyond strings — by design we do
  not try to introspect arbitrary objects, just JSON-shaped data.

Adding a new sensitive key or pattern? Add it here. Tests in
`backend/tests/test_redaction.py` lock the behaviour in.
"""
from __future__ import annotations

import re
from typing import Any, Mapping


REDACTED = "[redacted]"


# Keys whose presence inside any mapping means the value must be stripped.
# Matched case-insensitively. Keep this list ordered roughly by frequency
# so common keys are found fast.
SENSITIVE_KEYS: frozenset[str] = frozenset(
    {
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
)


# Patterns matched anywhere inside a string value, even when the
# surrounding key is opaque. Order does not matter; substitution is
# applied serially.
SECRET_VALUE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"sk_(live|test)_[A-Za-z0-9]{16,}"),   # Stripe secret keys
    re.compile(r"pk_(live|test)_[A-Za-z0-9]{16,}"),   # Stripe publishable keys (informational)
    re.compile(r"whsec_[A-Za-z0-9]{16,}"),            # Stripe webhook secrets
    re.compile(r"gsk_[A-Za-z0-9]{20,}"),              # Groq API keys
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]+"),  # JWTs
)


def scrub_string(value: str) -> str:
    """Replace any secret-looking substrings with `REDACTED`.

    Cheap: only runs the regex tuple in `SECRET_VALUE_PATTERNS`. Safe to
    call on every log line — the regexes are anchored on distinctive
    prefixes (`sk_`, `whsec_`, `gsk_`, `eyJ`) so the common case is a
    quick failed match.
    """
    for pattern in SECRET_VALUE_PATTERNS:
        value = pattern.sub(REDACTED, value)
    return value


def scrub_mapping(node: Any) -> Any:
    """Recursively redact sensitive keys.

    - For `Mapping` (dicts): returns a new dict with the same shape; any
      value whose key matches `SENSITIVE_KEYS` (case-insensitive) is
      replaced with `REDACTED`. Non-sensitive values are recursed into.
    - For `list`: returns a new list with each element recursed into.
    - For `str`: returns `scrub_string(value)`.
    - For anything else: returns the value unchanged.

    Never mutates the input.
    """
    if isinstance(node, Mapping):
        scrubbed: dict[Any, Any] = {}
        for k, v in node.items():
            if isinstance(k, str) and k.lower() in SENSITIVE_KEYS:
                scrubbed[k] = REDACTED
            else:
                scrubbed[k] = scrub_mapping(v)
        return scrubbed
    if isinstance(node, list):
        return [scrub_mapping(item) for item in node]
    if isinstance(node, str):
        return scrub_string(node)
    return node


__all__ = [
    "REDACTED",
    "SENSITIVE_KEYS",
    "SECRET_VALUE_PATTERNS",
    "scrub_string",
    "scrub_mapping",
]
