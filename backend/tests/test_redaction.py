"""Tests for the shared redaction primitives + the stdout-log filter.

These lock in the contract that `app.core.redaction` exposes to its two
consumers (`app.core.monitoring` for Sentry events, `app.core.logging`
for stdout records). Anything that breaks one consumer also breaks
this test file, which is the goal.
"""
from __future__ import annotations

import io
import json
import logging

import pytest

from app.core.logging import (
    SecretRedactingFilter,
    JsonFormatter,
    RequestContextFilter,
)
from app.core.redaction import (
    REDACTED,
    SENSITIVE_KEYS,
    scrub_mapping,
    scrub_string,
)


# --- Pure primitives -------------------------------------------------------


class TestScrubString:
    def test_returns_value_unchanged_for_plain_text(self):
        assert scrub_string("hello world") == "hello world"

    def test_redacts_stripe_secret_key(self):
        out = scrub_string("Authorization: Bearer sk_live_abcdefghijklmnopqrstuv")
        assert "sk_live_" not in out
        assert REDACTED in out

    def test_redacts_stripe_test_key(self):
        out = scrub_string("k=sk_test_abcdefghijklmnopqrstuv")
        assert "sk_test_" not in out
        assert REDACTED in out

    def test_redacts_stripe_webhook_secret(self):
        out = scrub_string("whsec_abcdefghijklmnopqrstuv leaked")
        assert "whsec_" not in out
        assert REDACTED in out

    def test_redacts_groq_api_key(self):
        out = scrub_string("gsk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa was logged")
        assert "gsk_" not in out
        assert REDACTED in out

    def test_redacts_jwt_like_token(self):
        token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            ".eyJzdWIiOiIxMjM0NTY3ODkwIn0"
            ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        )
        out = scrub_string(f"token={token}")
        assert "eyJ" not in out
        assert REDACTED in out

    def test_multiple_secrets_in_one_string_all_redacted(self):
        line = "sk_live_aaaaaaaaaaaaaaaaaaaaaa AND gsk_bbbbbbbbbbbbbbbbbbbbbbbbb"
        out = scrub_string(line)
        assert "sk_live_" not in out
        assert "gsk_" not in out
        assert out.count(REDACTED) == 2


class TestScrubMapping:
    def test_redacts_sensitive_keys_case_insensitively(self):
        out = scrub_mapping(
            {
                "Password": "hunter2",
                "PASSWORD": "hunter2",
                "AUTHORIZATION": "Bearer xyz",
                "x-admin-secret": "topsecret",
                "harmless": "value",
            }
        )
        assert out["Password"] == REDACTED
        assert out["PASSWORD"] == REDACTED
        assert out["AUTHORIZATION"] == REDACTED
        assert out["x-admin-secret"] == REDACTED
        assert out["harmless"] == "value"

    def test_recurses_into_nested_dicts(self):
        out = scrub_mapping(
            {
                "user": {
                    "email": "user@example.com",
                    "token": "secret123",
                    "nested": {"refresh_token": "deeper"},
                }
            }
        )
        assert out["user"]["email"] == "user@example.com"
        assert out["user"]["token"] == REDACTED
        assert out["user"]["nested"]["refresh_token"] == REDACTED

    def test_recurses_into_lists(self):
        out = scrub_mapping(
            [
                {"token": "a"},
                {"safe": "b", "password": "c"},
                "sk_live_aaaaaaaaaaaaaaaaaaaaa",
            ]
        )
        assert out[0]["token"] == REDACTED
        assert out[1]["safe"] == "b"
        assert out[1]["password"] == REDACTED
        assert REDACTED in out[2]

    def test_does_not_mutate_input(self):
        original = {"token": "abc", "nested": {"secret": "x"}}
        scrub_mapping(original)
        assert original == {"token": "abc", "nested": {"secret": "x"}}

    def test_passes_through_non_string_non_collection_values(self):
        out = scrub_mapping({"count": 42, "ok": True, "ratio": 0.5, "blob": b"x"})
        assert out == {"count": 42, "ok": True, "ratio": 0.5, "blob": b"x"}

    def test_all_sensitive_keys_recognised(self):
        # Sanity: every key declared in SENSITIVE_KEYS is actually redacted.
        for key in SENSITIVE_KEYS:
            out = scrub_mapping({key: "leak"})
            assert out[key] == REDACTED, f"{key!r} not redacted"


# --- The log filter --------------------------------------------------------


def _capture_log(logger: logging.Logger, handler: logging.Handler):
    """Helper: render a logger's output to a string via a fresh handler."""
    stream = io.StringIO()
    handler.stream = stream
    return stream


@pytest.fixture
def captured_logger():
    """A fresh logger with the JSON formatter + redaction + request-id
    filters wired exactly the way `configure_logging` wires the root
    logger. Each test gets its own logger name to avoid cross-test
    state."""
    logger = logging.getLogger(f"redaction-test-{id(object())}")
    logger.setLevel(logging.DEBUG)
    # Remove any previous handlers (defensive).
    for h in list(logger.handlers):
        logger.removeHandler(h)

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SecretRedactingFilter())
    handler.addFilter(RequestContextFilter())
    logger.addHandler(handler)
    logger.propagate = False  # do not double-log via the root handler
    return logger, stream


class TestSecretRedactingFilter:
    def test_redacts_stripe_key_in_message(self, captured_logger):
        logger, stream = captured_logger
        logger.info("loaded sk_live_abcdefghijklmnopqrstuv from env")
        record = json.loads(stream.getvalue())
        assert "sk_live_" not in record["message"]
        assert REDACTED in record["message"]

    def test_redacts_token_in_format_args(self, captured_logger):
        logger, stream = captured_logger
        # Each JWT segment must be ≥20 chars to match the regex — that
        # threshold is deliberate so short noise like "eyJfoo" doesn't
        # trigger false positives.
        token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            ".eyJzdWIiOiIxMjM0NTY3ODkwIn0AAAAAAAA"
            ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV"
        )
        logger.info("user logged in token=%s", token)
        record = json.loads(stream.getvalue())
        assert "eyJ" not in record["message"]
        assert REDACTED in record["message"]

    def test_redacts_dict_in_extra(self, captured_logger):
        logger, stream = captured_logger
        logger.info(
            "auth attempt",
            extra={"context": {"email": "u@x.com", "password": "hunter2"}},
        )
        record = json.loads(stream.getvalue())
        assert record["context"]["email"] == "u@x.com"
        assert record["context"]["password"] == REDACTED

    def test_redacts_sensitive_key_at_top_level_of_extra(self, captured_logger):
        logger, stream = captured_logger
        logger.info("ping", extra={"authorization": "Bearer abc"})
        record = json.loads(stream.getvalue())
        assert record["authorization"] == REDACTED

    def test_does_not_drop_request_id(self, captured_logger):
        from app.core.logging import set_request_id, reset_request_id

        logger, stream = captured_logger
        token = set_request_id("rid-123")
        try:
            logger.info("hello")
        finally:
            reset_request_id(token)
        record = json.loads(stream.getvalue())
        assert record["request_id"] == "rid-123"

    def test_does_not_corrupt_safe_payload(self, captured_logger):
        logger, stream = captured_logger
        logger.info(
            "no secrets here",
            extra={"user_id": 42, "feature": "search", "items": [1, 2, 3]},
        )
        record = json.loads(stream.getvalue())
        assert record["message"] == "no secrets here"
        assert record["user_id"] == 42
        assert record["feature"] == "search"
        assert record["items"] == [1, 2, 3]
