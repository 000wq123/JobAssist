import importlib
import sys
import types

import pytest
from httpx import ASGITransport, AsyncClient


class _PassThroughSlowAPIMiddleware:
    def __init__(self, app, *args, **kwargs):
        self.app = app

    async def __call__(self, scope, receive, send):
        await self.app(scope, receive, send)


def _load_main_module():
    fake_slowapi = types.ModuleType("slowapi")
    fake_slowapi.Limiter = lambda *args, **kwargs: types.SimpleNamespace(limit=lambda _value: (lambda fn: fn))
    fake_slowapi._rate_limit_exceeded_handler = lambda request, exc: None
    fake_errors = types.ModuleType("slowapi.errors")
    fake_errors.RateLimitExceeded = type("RateLimitExceeded", (Exception,), {})
    fake_util = types.ModuleType("slowapi.util")
    fake_util.get_remote_address = lambda request: "127.0.0.1"
    fake_middleware = types.ModuleType("slowapi.middleware")
    fake_middleware.SlowAPIMiddleware = _PassThroughSlowAPIMiddleware
    fake_stripe = types.ModuleType("stripe")
    fake_stripe.api_key = ""
    fake_stripe.checkout = types.SimpleNamespace(Session=types.SimpleNamespace(create=lambda **kwargs: None))
    fake_stripe.billing_portal = types.SimpleNamespace(Session=types.SimpleNamespace(create=lambda **kwargs: None))
    fake_stripe.Webhook = types.SimpleNamespace(construct_event=lambda *args, **kwargs: {})

    sys.modules.setdefault("slowapi", fake_slowapi)
    sys.modules.setdefault("slowapi.errors", fake_errors)
    sys.modules.setdefault("slowapi.util", fake_util)
    sys.modules.setdefault("slowapi.middleware", fake_middleware)
    sys.modules.setdefault("stripe", fake_stripe)
    sys.modules.pop("app.main", None)
    return importlib.import_module("app.main")


class _HealthySession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, _query):
        return None


class _BrokenSession:
    async def __aenter__(self):
        raise RuntimeError("db down")

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_health_returns_request_id_header_and_body():
    main = _load_main_module()
    transport = ASGITransport(app=main.app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health", headers={"x-request-id": "qa-health-1"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "qa-health-1"
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["request_id"] == "qa-health-1"


@pytest.mark.asyncio
async def test_health_dependencies_reports_ready_when_db_and_providers_are_ok(monkeypatch):
    main = _load_main_module()
    # AsyncSessionLocal + get_provider_health are imported by name into
    # `app.api.routes.health` (where the /health/dependencies handler lives),
    # so we patch the names *there* — patching `app.main` no longer works
    # since the health handler was extracted out of main.py.
    from app.api.routes import health as health_module

    monkeypatch.setattr(health_module, "AsyncSessionLocal", lambda: _HealthySession())
    monkeypatch.setattr(
        health_module,
        "get_provider_health",
        lambda: {
            "groq": {"configured": True, "model": "test"},
            "adzuna": {"configured": True, "circuit_breaker": {"open": False}},
            "email": {"active_provider": "brevo"},
            "stripe": {"configured": True},
            "sentry": {"configured": True, "traces_sample_rate": 0.1},
        },
    )

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health/dependencies", headers={"x-request-id": "qa-health-2"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "qa-health-2"
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["ready"] is True
    assert payload["database"] == {"ok": True}
    assert payload["providers"]["email"]["active_provider"] == "brevo"
    assert payload["request_id"] == "qa-health-2"


@pytest.mark.asyncio
async def test_health_dependencies_reports_degraded_when_db_is_down(monkeypatch):
    main = _load_main_module()
    from app.api.routes import health as health_module

    monkeypatch.setattr(health_module, "AsyncSessionLocal", lambda: _BrokenSession())
    monkeypatch.setattr(
        health_module,
        "get_provider_health",
        lambda: {
            "groq": {"configured": False, "model": None},
            "adzuna": {"configured": False, "circuit_breaker": {"open": True}},
            "email": {"active_provider": None},
            "stripe": {"configured": False},
            "sentry": {"configured": False, "traces_sample_rate": 0.0},
        },
    )

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health/dependencies")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["ready"] is False
    assert payload["database"]["ok"] is False
    assert payload["database"]["error"] == "db down"
