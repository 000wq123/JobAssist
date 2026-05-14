import contextvars
import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone


request_id_ctx = contextvars.ContextVar("request_id", default="-")


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True


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

    handler = None
    for existing in root_logger.handlers:
        if isinstance(existing, logging.StreamHandler):
            handler = existing
            break

    if handler is None:
        handler = logging.StreamHandler(sys.stdout)
        root_logger.addHandler(handler)

    handler.setFormatter(formatter)
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
