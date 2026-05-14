import json
import logging
import time

from app.core.logging import JsonFormatter, elapsed_ms, new_request_id, request_id_ctx, reset_request_id, set_request_id


def test_json_formatter_includes_request_id_and_extra_fields():
    formatter = JsonFormatter()
    token = set_request_id("req-123")
    try:
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg="hello",
            args=(),
            exc_info=None,
        )
        record.path = "/api/test"
        record.status_code = 200

        payload = json.loads(formatter.format(record))
        assert payload["request_id"] == "req-123"
        assert payload["path"] == "/api/test"
        assert payload["status_code"] == 200
        assert payload["message"] == "hello"
    finally:
        reset_request_id(token)


def test_new_request_id_has_expected_shape():
    request_id = new_request_id()
    assert isinstance(request_id, str)
    assert len(request_id) == 12


def test_elapsed_ms_is_non_negative():
    start = time.perf_counter()
    assert elapsed_ms(start) >= 0


def test_request_id_context_resets():
    token = set_request_id("req-xyz")
    try:
        assert request_id_ctx.get() == "req-xyz"
    finally:
        reset_request_id(token)
    assert request_id_ctx.get() == "-"
