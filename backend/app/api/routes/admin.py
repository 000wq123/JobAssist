"""Admin operations. All endpoints require the `X-Admin-Secret` header to
match `settings.ADMIN_SECRET` and are rate-limited + audit-logged.
"""
from __future__ import annotations

import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import metrics
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.usage import UsageRecord

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_admin(request: Request, action: str) -> str:
    """Verify X-Admin-Secret with constant-time compare. Returns client IP."""
    secret = request.headers.get("x-admin-secret", "")
    client_ip = request.client.host if request.client else "-"
    if not settings.ADMIN_SECRET or not hmac.compare_digest(secret, settings.ADMIN_SECRET):
        metrics.inc(
            "jobassist_admin_actions_total",
            labels={"action": action, "outcome": "denied"},
        )
        logger.warning(
            "admin.denied",
            extra={
                "client_ip": client_ip,
                "path": request.url.path,
                "request_id": getattr(request.state, "request_id", "-"),
            },
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    return client_ip


@router.post("/reset-usage")
@limiter.limit("3/minute")
async def reset_usage(request: Request, db: AsyncSession = Depends(get_db)):
    """Reset all usage_tracking counts to zero. Requires X-Admin-Secret."""
    client_ip = _require_admin(request, action="reset_usage")
    result = await db.execute(delete(UsageRecord))
    await db.commit()
    metrics.inc(
        "jobassist_admin_actions_total",
        labels={"action": "reset_usage", "outcome": "ok"},
    )
    logger.warning(
        "admin.reset_usage.executed",
        extra={
            "client_ip": client_ip,
            "deleted_rows": result.rowcount,
            "request_id": getattr(request.state, "request_id", "-"),
        },
    )
    return {
        "status": "ok",
        "message": "All usage records deleted",
        "deleted_rows": result.rowcount,
    }


@router.get("/metrics", include_in_schema=False)
async def metrics_endpoint(request: Request):
    """Prometheus-compatible scrape endpoint.

    Gated by `X-Admin-Secret` so the prod instance doesn't leak counter
    state to anyone who happens to know the URL. Point your scraper at:

        curl -H "X-Admin-Secret: …" https://api.jobassist.tech/api/admin/metrics
    """
    from fastapi.responses import PlainTextResponse

    _require_admin(request, action="metrics")
    body = metrics.render()
    return PlainTextResponse(content=body, media_type="text/plain; version=0.0.4")
