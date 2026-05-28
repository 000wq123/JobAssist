import contextvars
import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone

from app.core.redaction import REDACTED, SENSITIVE_KEYS, scrub_mapping, scrub_string


request_id_ctx = contextvars.ContextVar("request_id", default="-")


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True


class SecretRedactingFilter(logging.Filter):
    """Strip secrets from every log record before it is formatted.

    Reuses the exact same `SENSITIVE_KEYS` and `SECRET_VALUE_PATTERNS`
    list as the Sentry scrubber (`app.core.monitoring`) via the shared
    `app.core.redaction` module. There is no "Sentry-safe vs stdout-safe"
    gap to drift.

    The filter mutates `record.msg`, `record.args`, and any non-standard
    attribute injected via `logger.x("...", extra={...})` so the JSON
    formatter sees scrubbed values in *both* the rendered message and
    the structured payload.

    Always returns True (filters never drop log records here — we want
    the visibility, just without the secrets).
    """

    # Logging-internal attributes we must not touch. Mirrors the standard
    # set used by `JsonFormatter` below + a couple Python adds dynamically.
    _PROTECTED = frozenset(
        {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
            "asctime", "request_id", "taskName",
        }
    )

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003 — stdlib API
        # 1. Pre-rendered message string (already includes %-args).
        if isinstance(record.msg, str):
            record.msg = scrub_string(record.msg)

        # 2. %-style format args. Strings get scrubbed; dicts/lists go
        #    through scrub_mapping so e.g. logger.info("%s", {"token": ...})
        #    becomes "{'token': '[redacted]'}".
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(self._scrub_value(a) for a in record.args)
            elif isinstance(record.args, dict):
                record.args = scrub_mapping(record.args)
            else:
                record.args = self._scrub_value(record.args)

        # 3. Free-form `extra={...}` fields the formatter will splat into
        #    the JSON payload. Mutate in place because `record.__dict__`
        #    is what the formatter walks.
        #
        #    Two-pass redaction for parity with `scrub_mapping`:
        #      a) if the top-level extra key itself is sensitive
        #         (`authorization`, `token`, etc.), redact the whole
        #         value regardless of type;
        #      b) otherwise, recurse with `_scrub_value` so nested dicts
        #         and lists still get scrubbed.
        for key, value in list(record.__dict__.items()):
            if key in self._PROTECTED or key.startswith("_"):
                continue
            if isinstance(key, str) and key.lower() in SENSITIVE_KEYS:
                record.__dict__[key] = REDACTED
            else:
                record.__dict__[key] = self._scrub_value(value)

        return True

    @staticmethod
    def _scrub_value(value):
        if isinstance(value, str):
            return scrub_string(value)
        if isinstance(value, (dict, list)):
            return scrub_mapping(value)
        return value


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_ctx.get("-")),
        }
        standard = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename", "module",
            "exc_info", "exc_text", "stack_info", "lineno", "funcName", "created", "msecs",
            "relativeCreated", "thread", "threadName", "processName", "process", "message",
            "asctime", "request_id",
        }
        for key, value in record.__dict__.items():
            if key not in standard and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    root_logger = logging.getLogger()
    normalized_level = getattr(logging, str(level).upper(), logging.INFO)
    root_logger.setLevel(normalized_level)

    formatter = JsonFormatter()
    context_filter = RequestContextFilter()
    redacting_filter = SecretRedactingFilter()

    handler = None
    for existing in root_logger.handlers:
        if isinstance(existing, logging.StreamHandler):
            handler = existing
            break

    if handler is None:
        handler = logging.StreamHandler(sys.stdout)
        root_logger.addHandler(handler)

    handler.setFormatter(formatter)
    # Filters run in the order they are added. Redaction first so the
    # request-id we just attached survives untouched, and so the JSON
    # formatter only ever sees scrubbed values.
    if not any(isinstance(existing, SecretRedactingFilter) for existing in handler.filters):
        handler.addFilter(redacting_filter)
    if not any(isinstance(existing, RequestContextFilter) for existing in handler.filters):
        handler.addFilter(context_filter)


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def set_request_id(request_id: str) -> contextvars.Token:
    return request_id_ctx.set(request_id)


def reset_request_id(token: contextvars.Token) -> None:
    request_id_ctx.reset(token)


def elapsed_ms(start_time: float) -> int:
    return max(0, int((time.perf_counter() - start_time) * 1000))
