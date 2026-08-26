"""Health probes + the SPA bootstrap endpoint (`/api/init`).

`/health` is the lightweight liveness probe.
`/health/dependencies` reports configured providers; pass `?deep=true` to
also TCP-probe Groq + Adzuna (cached for `_DEEP_CACHE_TTL_S`).
"""
from __future__ import annotations

import asyncio
import json
import hashlib
import logging
import time

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.provider_health import get_provider_health
from app.core.security import get_current_user
from app.core.usage import get_all_usage, get_user_plan
from app.models.job import Job
from app.models.profile_v2 import ProfileV2
from app.models.resume import Resume
from app.models.user import User
from app.models.user_profile import UserProfile

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    return {
        "status": "ok",
        "version": "0.1.0",
        "request_id": getattr(request.state, "request_id", "-"),
    }


async def _tcp_reachable(host: str, port: int = 443, timeout: float = 3.0) -> bool:
    """Return True if a TCP connection to `host:port` can be established."""
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except Exception:
        return False


# Cache for deep TCP probes — reused for `_DEEP_CACHE_TTL_S` seconds so an
# external uptime monitor can't hammer Groq/Adzuna with new socket connections.
_DEEP_CACHE_TTL_S = 30.0
_deep_cache: dict[str, float | bool] = {"ts": 0.0, "groq": False, "adzuna": False}
_deep_cache_lock = asyncio.Lock()


async def _cached_deep_probes() -> tuple[bool, bool]:
    """Return `(groq_reachable, adzuna_reachable)`, TCP-probing at most once per TTL."""
    now = time.monotonic()
    if now - float(_deep_cache["ts"]) < _DEEP_CACHE_TTL_S:
        return bool(_deep_cache["groq"]), bool(_deep_cache["adzuna"])
    async with _deep_cache_lock:
        # Double-check inside the lock — another coroutine may have refreshed already.
        now = time.monotonic()
        if now - float(_deep_cache["ts"]) < _DEEP_CACHE_TTL_S:
            return bool(_deep_cache["groq"]), bool(_deep_cache["adzuna"])
        groq_reachable, adzuna_reachable = await asyncio.gather(
            _tcp_reachable("api.groq.com"),
            _tcp_reachable("api.adzuna.com"),
        )
        _deep_cache["groq"] = groq_reachable
        _deep_cache["adzuna"] = adzuna_reachable
        _deep_cache["ts"] = now
        return groq_reachable, adzuna_reachable


@router.get("/health/dependencies")
async def health_dependencies(request: Request, deep: bool = False):
    database = {"ok": False}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        database = {"ok": True}
    except Exception as exc:
        logger.warning("Database health check failed", extra={"error": str(exc)})
        database = {"ok": False, "error": str(exc) if settings.DEBUG else "unavailable"}

    providers = get_provider_health()

    if deep:
        groq_reachable, adzuna_reachable = await _cached_deep_probes()
        providers["groq"]["reachable"] = groq_reachable
        providers["adzuna"]["reachable"] = adzuna_reachable

    providers_ok = (
        providers["groq"]["configured"]
        and providers["adzuna"]["configured"]
        and providers["email"]["active_provider"] is not None
        and providers["stripe"]["configured"]
    )

    return {
        "status": "ok" if database["ok"] else "degraded",
        "request_id": getattr(request.state, "request_id", "-"),
        "database": database,
        "providers": providers,
        "ready": database["ok"] and providers_ok,
    }


@router.get("/api/init")
async def init(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Single endpoint that returns all bootstrap data so the SPA loads in
    one round-trip instead of `/me` + `/profile` + `/resumes` + `/usage`."""
    # 1. Load profile if it exists. Do not mutate state in a GET.
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    # 2. Fire independent reads concurrently.
    async def _resumes():
        result = await db.execute(
            select(Resume)
            .where(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .limit(50)
        )
        return result.scalars().all()

    async def _resumes_total():
        result = await db.execute(
            select(func.count()).select_from(Resume).where(Resume.user_id == current_user.id)
        )
        return result.scalar() or 0

    async def _plan():
        return await get_user_plan(db, current_user.id)

    async def _jobs_summary():
        total_result = await db.execute(
            select(func.count()).select_from(Job).where(Job.user_id == current_user.id)
        )
        status_result = await db.execute(
            select(Job.status, func.count(Job.id))
            .where(Job.user_id == current_user.id)
            .group_by(Job.status)
        )
        return {
            "jobs_total": total_result.scalar() or 0,
            "jobs_by_status": {status: count for status, count in status_result.all()},
        }

    async def _cv_profile():
        """Summarize the CV builder profile (profiles_v2) so the SPA can tell
        whether the user has a CV without a separate request. Uploaded PDFs
        (resumes) are counted separately."""
        result = await db.execute(
            select(ProfileV2).where(ProfileV2.user_id == current_user.id)
        )
        cv = result.scalar_one_or_none()
        if cv is None:
            return {"has_content": False, "completion_pct": 0, "updated_at": None}
        has_content = bool(
            (cv.vorname and cv.nachname)
            or (cv.vorname and cv.geburtsdatum)
            or cv.schulname
            or (cv.erfahrungen and len(cv.erfahrungen) > 0)
            or (cv.faehigkeiten and len(cv.faehigkeiten) > 0)
            or (cv.weiterbildungen and len(cv.weiterbildungen) > 0)
            or (cv.profil and cv.profil.strip())
        )
        return {
            "has_content": has_content,
            "completion_pct": cv.completion_pct or 0,
            "updated_at": cv.updated_at,
        }

    resumes, resumes_total, plan, jobs_summary, cv_profile = await asyncio.gather(
        _resumes(), _resumes_total(), _plan(), _jobs_summary(), _cv_profile()
    )

    # 3. Usage depends on plan, so it runs after.
    usage = await get_all_usage(db, current_user.id, plan)

    payload = {
        "me": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_verified": current_user.is_verified,
            "currency": current_user.currency,
            "location": current_user.location,
            "language": current_user.language,
            "daily_manual_run_count": current_user.daily_manual_run_count or 0,
            "daily_creation_count": current_user.daily_creation_count or 0,
            "daily_counts_reset_at": current_user.daily_counts_reset_at,
        },
        "profile": (
            {
                "id": profile.id,
                "user_id": profile.user_id,
                "desired_locations": profile.desired_locations,
                "salary_min": profile.salary_min,
                "salary_max": profile.salary_max,
                "job_types": profile.job_types,
                "industries": profile.industries,
                "experience_level": profile.experience_level,
                "is_open_to_relocation": profile.is_open_to_relocation,
                "avatar": profile.avatar,
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
            }
            if profile
            else {
                "id": 0,
                "user_id": current_user.id,
                "desired_locations": [],
                "salary_min": None,
                "salary_max": None,
                "job_types": [],
                "industries": [],
                "experience_level": None,
                "is_open_to_relocation": False,
                "avatar": None,
                "created_at": None,
                "updated_at": None,
            }
        ),
        "resumes": [
            {"id": r.id, "filename": r.filename, "created_at": r.created_at}
            for r in resumes
        ],
        "resumes_total": resumes_total,
        "cv": cv_profile,
        "jobs_total": jobs_summary["jobs_total"],
        "jobs_by_status": jobs_summary["jobs_by_status"],
        "plan": plan,
        "usage": usage,
    }

    # ETag-based revalidation. The payload is user-scoped and cheap to hash;
    # an unchanged payload returns 304 and the SPA keeps its cached copy,
    # saving the full transfer (the DB queries still run — this is a
    # bandwidth win, not a compute win).
    body = json.dumps(payload, default=str, sort_keys=True).encode()
    etag = f'W/"{hashlib.sha256(body).hexdigest()[:32]}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    return JSONResponse(
        content=payload,
        headers={
            "ETag": etag,
            # Override the global no-store: /init responses carry a validator
            # so the browser may revalidate them, but must never use them
            # without checking.
            "Cache-Control": "no-cache",
        },
    )


@router.get("/metrics")
async def metrics(db: AsyncSession = Depends(get_db)) -> dict:
    """Public lightweight metrics for monitoring dashboards. No auth required."""
    user_count = await db.execute(select(func.count(User.id)))
    job_count = await db.execute(select(func.count(Job.id)))
    resume_count = await db.execute(select(func.count(Resume.id)))
    job_statuses = await db.execute(
        select(Job.status, func.count(Job.id)).group_by(Job.status)
    )
    return {
        "users_total": user_count.scalar(),
        "jobs_total": job_count.scalar(),
        "resumes_total": resume_count.scalar(),
        "jobs_by_status": {status: count for status, count in job_statuses.all()},
    }
