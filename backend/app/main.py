"""FastAPI app factory and wiring.

All real logic lives in dedicated modules:
  * `app.middleware`       — security headers, request-id, body-size, CSRF
  * `app.tasks`            — background schedulers
  * `app.api.routes.*`     — every HTTP route
  * `app.core.*`           — config, security, rate limit, advisory locks, …

This file should stay small. If it grows past ~150 LOC again, extract.
"""
from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import (
    admin,
    ai,
    ai_assistant,
    auth,
    billing,
    contact,
    cover_letter,
    health,
    interview,
    job_alerts,
    jobs,
    logo_proxy,
    motivationsschreiben,
    profile,
    research,
    resume,
)
from app.api.routes import settings as settings_routes
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import configure_logging
from app.core.monitoring import configure_sentry
from app.core.rate_limit import limiter
from app.middleware import install_middleware
from app.models import processed_webhook_event as _pwhe  # noqa: F401 — registers model with Base.metadata
from app.tasks import (
    daily_count_reset_loop,
    job_alert_scheduler_loop,
    stale_user_cleanup_loop,
)

configure_logging(settings.LOG_LEVEL)
configure_sentry(settings.SENTRY_DSN, settings.SENTRY_TRACES_SAMPLE_RATE)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Schema management:
      • PostgreSQL — Alembic owns the schema. Migrations run once per deploy
        via `alembic upgrade head` (see `render.yaml.preDeployCommand`),
        so the lifespan does NOT touch the schema.
      • SQLite (tests / local dev) — Alembic is overkill, so we fall back
        to `Base.metadata.create_all` for an instant schema bootstrap.
    """
    if engine.dialect.name != "postgresql":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    tasks = [
        asyncio.create_task(stale_user_cleanup_loop(), name="stale_user_cleanup"),
        asyncio.create_task(job_alert_scheduler_loop(), name="job_alert_scheduler"),
        asyncio.create_task(daily_count_reset_loop(), name="daily_count_reset"),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
        await engine.dispose()


app = FastAPI(
    title="Job Application Assistant API",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=True,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Rate limiting (SlowAPI) — limiter itself lives in app.core.rate_limit so
# every route module can import it without a circular dep on this file.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware stack. Order matters — FastAPI runs the LAST `add_middleware`
# call FIRST on the way in, so we install in reverse-execution order:
#   request → CORS → GZip → SlowAPI → security/csrf → route
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
install_middleware(app)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all 500 handler. Echoes CORS headers because Starlette doesn't
    run the CORSMiddleware on raised exceptions, which otherwise produces
    confusing 'CORS error' messages in the browser instead of the real 500."""
    origin = request.headers.get("origin", "")
    headers: dict[str, str] = {}
    origin_allowed = origin in settings.allowed_origins_list or (
        bool(settings.ALLOWED_ORIGIN_REGEX)
        and bool(re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin))
    )
    if origin_allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    logger.exception(
        "Unhandled exception",
        extra={"path": str(request.url.path), "method": request.method},
    )
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "request_id": getattr(request.state, "request_id", "-")},
        headers=headers,
    )


# Routers ─────────────────────────────────────────────────────────────────────
app.include_router(ai.router,                   prefix="/api/ai",                   tags=["AI"])
app.include_router(auth.router,                 prefix="/api/auth",                 tags=["Auth"])
app.include_router(settings_routes.router,      prefix="/api/settings",             tags=["Settings"])
app.include_router(resume.router,               prefix="/api/resume",               tags=["Resume"])
app.include_router(jobs.router,                 prefix="/api/jobs",                 tags=["Jobs"])
app.include_router(cover_letter.router,         prefix="/api/cover-letter",         tags=["Cover Letter"])
app.include_router(interview.router,            prefix="/api/interview",            tags=["Interview Prep"])
app.include_router(motivationsschreiben.router, prefix="/api/motivationsschreiben", tags=["Motivationsschreiben"])
app.include_router(ai_assistant.router,         prefix="/api/ai-assistant",         tags=["KI-Assistent"])
app.include_router(job_alerts.router,           prefix="/api/job-alerts",           tags=["Job Alerts"])
app.include_router(research.router,             prefix="/api/research",             tags=["Research"])
app.include_router(billing.router,              prefix="/api/billing",              tags=["Billing"])
app.include_router(contact.router,              prefix="/api/contact",              tags=["Contact"])
app.include_router(admin.router,                prefix="/api/admin",                tags=["Admin"])
app.include_router(logo_proxy.router,           prefix="/api",                      tags=["Utils"])
app.include_router(profile.router,              prefix="/api/profile",              tags=["Profile"])
app.include_router(health.router,                                                   tags=["Health"])
