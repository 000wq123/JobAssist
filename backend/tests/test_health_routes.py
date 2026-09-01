import hashlib
import importlib
import json
import sys
import types
from datetime import datetime, timezone

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
    queries = []

    async def __aenter__(self):
        type(self).queries = []
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, query):
        type(self).queries.append(str(query))
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
    assert any("refresh_tokens" in query for query in _HealthySession.queries)


@pytest.mark.asyncio
async def test_health_dependencies_does_not_require_stripe_when_billing_is_disabled(monkeypatch):
    main = _load_main_module()
    from app.api.routes import health as health_module

    monkeypatch.setattr(health_module, "AsyncSessionLocal", lambda: _HealthySession())
    monkeypatch.setattr(health_module.settings, "ENABLE_BILLING", False)
    monkeypatch.setattr(
        health_module,
        "get_provider_health",
        lambda: {
            "groq": {"configured": True, "model": "test"},
            "adzuna": {"configured": True, "circuit_breaker": {"open": False}},
            "email": {"active_provider": "brevo"},
            "stripe": {"configured": False},
            "sentry": {"configured": False, "traces_sample_rate": 0.0},
        },
    )

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health/dependencies")

    assert response.status_code == 200
    assert response.json()["ready"] is True


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

def _etag_of(payload: dict) -> str:
    body = json.dumps(payload, default=str, sort_keys=True).encode()
    return f'W/"{hashlib.sha256(body).hexdigest()[:32]}"'


@pytest.mark.asyncio
async def test_init_reports_cv_builder_profile_content(monkeypatch):
    """`/api/init` includes a `cv` summary derived from the profiles_v2 row so
    the dashboard can tell that a builder-created CV exists (not just uploaded
    PDFs in the resumes table)."""
    main = _load_main_module()
    from app.api.routes import health as health_module

    fake_user = types.SimpleNamespace(
        id=7,
        email="cv@example.com",
        full_name="CV User",
        is_verified=True,
        currency="EUR",
        location=None,
        language="de",
        daily_manual_run_count=0,
        daily_creation_count=0,
        daily_counts_reset_at=None,
    )

    class _FakeCv:
        vorname = "Lisa"
        nachname = "Muster"
        geburtsdatum = None
        schulname = "HAK Wien"
        erfahrungen = []
        faehigkeiten = []
        weiterbildungen = []
        profil = None
        completion_pct = 42
        updated_at = None

    class _FakeResult:
        def __init__(self, query):
            self._query = query

        def scalar_one_or_none(self):
            if "profiles_v2" in str(self._query):
                return _FakeCv()
            return None

        def scalars(self):
            return types.SimpleNamespace(all=lambda: [])

        def all(self):
            return []

        def scalar(self):
            return 0

    class _InitSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, query):
            return _FakeResult(query)

    async def _fake_usage(_db, _user_id, _plan):
        return []

    monkeypatch.setattr(health_module, "get_all_usage", _fake_usage)

    from app.core.database import get_db
    from app.core.security import get_current_user as gcu

    async def _override_db():
        async with _InitSession() as session:
            yield session

    main.app.dependency_overrides[get_db] = _override_db
    main.app.dependency_overrides[gcu] = lambda: fake_user
    try:
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/init")
        assert response.status_code == 200
        cv = response.json()["cv"]
        assert cv["has_content"] is True
        assert cv["completion_pct"] == 42
    finally:
        main.app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_init_returns_etag_and_304_on_matching_if_none_match(monkeypatch):
    """`/api/init` carries an ETag; a matching If-None-Match yields 304."""
    main = _load_main_module()
    from app.api.routes import health as health_module

    fake_user = types.SimpleNamespace(
        id=1,
        email="t@example.com",
        full_name="T",
        is_verified=True,
        currency="EUR",
        location=None,
        language="de",
        daily_manual_run_count=0,
        daily_creation_count=0,
        daily_counts_reset_at=None,
    )
    class _FakeResult:
        def __init__(self, value=None):
            self._value = value if value is not None else ()

        def scalar_one_or_none(self):
            return None

        def scalars(self):
            return types.SimpleNamespace(all=lambda: list(self._value))

        def all(self):
            return list(self._value)

        def scalar(self):
            return 0

    async def _execute(_query):
        # Order of awaited queries in the handler: profile, resumes,
        # resumes_total, plan, jobs_total, jobs_by_status.
        return _FakeResult(None)

    class _InitSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        execute = staticmethod(_execute)

    monkeypatch.setattr(health_module, "AsyncSessionLocal", lambda: _InitSession())
    monkeypatch.setattr(health_module, "get_current_user", lambda: fake_user)

    async def _fake_usage(_db, _user_id, _plan):
        return []

    monkeypatch.setattr(health_module, "get_all_usage", _fake_usage)
    import app.api.routes.health as h
    from app.core.database import get_db

    async def _override_db():
        async with _InitSession() as session:
            yield session

    main.app.dependency_overrides[get_db] = _override_db
    # get_current_user is a dependency imported into the route module — patch it there
    import app.api.routes.health as h  # noqa: F811
    try:
        transport = ASGITransport(app=main.app)
        # Auth: patch security dependency via app dependency_overrides too
        from app.core.security import get_current_user as gcu

        main.app.dependency_overrides[gcu] = lambda: fake_user
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            first = await client.get("/api/init")
            assert first.status_code == 200
            etag = first.headers.get("ETag")
            assert etag, "ETag header missing on /api/init"
            assert first.headers.get("Cache-Control") == "no-cache"
            # No CV builder profile → the cv summary reports no content.
            assert first.json()["cv"] == {
                "has_content": False,
                "completion_pct": 0,
                "updated_at": None,
            }

            second = await client.get(
                "/api/init", headers={"If-None-Match": etag}
            )
            assert second.status_code == 304
    finally:
        main.app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_init_serializes_datetime_fields(monkeypatch):
    """`/api/init` must return 200 even when the payload carries real datetime
    values (e.g. `daily_counts_reset_at` set by the job-alerts flow). The raw
    `JSONResponse(content=payload)` path 500'd with "Object of type datetime is
    not JSON serializable", which left the SPA without identity ("Benutzer" +
    "?" avatar) while the rest of the page rendered from cache."""
    main = _load_main_module()
    from app.api.routes import health as health_module

    fake_user = types.SimpleNamespace(
        id=1,
        email="t@example.com",
        full_name="T",
        is_verified=True,
        currency="EUR",
        location=None,
        language="de",
        daily_manual_run_count=0,
        daily_creation_count=0,
        daily_counts_reset_at=datetime(2026, 8, 26, 0, 0, tzinfo=timezone.utc),
    )

    class _FakeResult:
        def __init__(self, value=None):
            self._value = value if value is not None else ()

        def scalar_one_or_none(self):
            return None

        def scalars(self):
            return types.SimpleNamespace(all=lambda: list(self._value))

        def all(self):
            return list(self._value)

        def scalar(self):
            return 0

    class _InitSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, _query):
            return _FakeResult(None)

    async def _fake_usage(_db, _user_id, _plan):
        return []

    monkeypatch.setattr(health_module, "get_all_usage", _fake_usage)
    from app.core.database import get_db
    from app.core.security import get_current_user as gcu

    async def _override_db():
        async with _InitSession() as session:
            yield session

    main.app.dependency_overrides[get_db] = _override_db
    main.app.dependency_overrides[gcu] = lambda: fake_user
    try:
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/init")
        assert response.status_code == 200
        body = response.json()
        assert body["me"]["full_name"] == "T"
        assert body["me"]["daily_counts_reset_at"].startswith("2026-08-26")
    finally:
        main.app.dependency_overrides.clear()
