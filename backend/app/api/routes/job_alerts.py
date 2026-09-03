import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
import jwt
from jwt import PyJWTError as JWTError
from pydantic import BaseModel
from sqlalchemy import case, func as sa_func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.plans import get_limit
from app.core.security import get_current_user
from app.core.usage import get_user_plan
from app.core.rate_limit import limiter
from app.models.job_alert import JobAlert
from app.models.user import User
from app.schemas.job_alert import JobAlertCreate, JobAlertOut, JobAlertUpdate, JobAlertListResponse
from app.services.email_service import send_job_alert_email
from app.services.job_search import search_jobs


def _make_unsubscribe_token(alert_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=365)
    payload = {"alert_id": alert_id, "purpose": "unsubscribe", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode_unsubscribe_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "unsubscribe":
            raise ValueError("wrong purpose")
        return int(payload["alert_id"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Abmelde-Token") from exc

logger = logging.getLogger(__name__)
router = APIRouter()


def _ensure_daily_reset(user: User) -> None:
    """Reset daily counters if we've crossed midnight UTC since the last reset.
    Mutates the user object in-place; caller must commit."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    reset_at = user.daily_counts_reset_at
    if reset_at is not None and reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)
    if reset_at is None or reset_at < today_start:
        user.daily_manual_run_count = 0
        user.daily_creation_count = 0
        user.daily_counts_reset_at = today_start


@router.get("/", response_model=JobAlertListResponse)
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobAlertListResponse:
    plan = await get_user_plan(db, current_user.id)
    run_limit = get_limit(plan, "daily_manual_runs")
    creation_limit = get_limit(plan, "daily_alert_edits")

    # Apply any missed midnight reset before reading counts
    _ensure_daily_reset(current_user)
    await db.commit()
    await db.refresh(current_user)

    # Fetch alerts after commit so they aren't expired during serialization
    result = await db.execute(
        select(JobAlert)
        .where(JobAlert.user_id == current_user.id)
        .order_by(JobAlert.created_at.desc())
    )
    alerts = result.scalars().all()

    return JobAlertListResponse(
        alerts=alerts,
        daily_manual_run_count=current_user.daily_manual_run_count,
        daily_creation_count=current_user.daily_creation_count,
        daily_manual_run_limit=run_limit,
        daily_creation_limit=creation_limit,
    )


@router.post("/", response_model=JobAlertOut, status_code=201)
async def create_alert(
    payload: JobAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobAlert:
    locked_user_result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    locked_user = locked_user_result.scalar_one()

    plan = await get_user_plan(db, current_user.id)

    # --- Plan alert-count limit ---
    limit = get_limit(plan, "job_alerts")
    if limit != -1:
        count_result = await db.execute(
            select(sa_func.count()).where(JobAlert.user_id == current_user.id)
        )
        current_count = count_result.scalar() or 0
        if current_count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "usage_limit",
                    "feature": "job_alerts",
                    "plan": plan,
                    "used": current_count,
                    "limit": limit,
                    "message": f"Du hast dein Limit für Job-Alerts erreicht ({current_count}/{limit}). Bitte upgrade deinen Plan.",
                },
            )

    # --- Daily creation limit ---
    _ensure_daily_reset(locked_user)
    creation_limit = get_limit(plan, "daily_alert_edits")
    if creation_limit != -1 and locked_user.daily_creation_count >= creation_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "daily_creation_limit",
                "used": locked_user.daily_creation_count,
                "limit": creation_limit,
                "message": (
                    f"Tages-Limit für Erstellungen/Bearbeitungen erreicht "
                    f"({locked_user.daily_creation_count}/{creation_limit}). "
                    f"Morgen um 00:00 Uhr zurückgesetzt."
                ),
            },
        )

    locked_user.daily_creation_count += 1

    alert = JobAlert(
        user_id=current_user.id,
        keywords=payload.keywords,
        location=payload.location,
        job_type=payload.job_type,
        email=current_user.email,
        frequency=payload.frequency,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


REWRITE_WINDOW_HOURS = 3


@router.patch("/{alert_id}", response_model=JobAlertOut)
async def update_alert(
    alert_id: int,
    payload: JobAlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobAlert:
    result = await db.execute(
        select(JobAlert)
        .where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
        .with_for_update()
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    update_data = payload.model_dump(exclude_unset=True)
    rewrite_fields = {"keywords", "location", "job_type", "frequency"}
    is_rewrite = any(
        field in update_data and update_data[field] != getattr(alert, field)
        for field in rewrite_fields
    )

    if is_rewrite:
        now = datetime.now(timezone.utc)
        last_changed = alert.updated_at or alert.created_at
        if last_changed and last_changed.tzinfo is None:
            last_changed = last_changed.replace(tzinfo=timezone.utc)

        if last_changed and (now - last_changed) < timedelta(hours=REWRITE_WINDOW_HOURS):
            remaining_seconds = int(
                ((last_changed + timedelta(hours=REWRITE_WINDOW_HOURS)) - now).total_seconds()
            )
            hours_left = max(0, remaining_seconds // 3600)
            minutes_left = max(1, (remaining_seconds % 3600) // 60)
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Du kannst diesen Alert nur alle {REWRITE_WINDOW_HOURS} Stunden bearbeiten. "
                    f"Verfügbar in {hours_left}h {minutes_left}min."
                ),
            )

        # Lock user row and enforce daily creation limit
        locked_user_result = await db.execute(
            select(User).where(User.id == current_user.id).with_for_update()
        )
        locked_user = locked_user_result.scalar_one()
        plan = await get_user_plan(db, current_user.id)

        _ensure_daily_reset(locked_user)
        creation_limit = get_limit(plan, "daily_alert_edits")
        if creation_limit != -1 and locked_user.daily_creation_count >= creation_limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "daily_creation_limit",
                    "used": locked_user.daily_creation_count,
                    "limit": creation_limit,
                    "message": (
                        f"Tages-Limit für Erstellungen/Bearbeitungen erreicht "
                        f"({locked_user.daily_creation_count}/{creation_limit}). "
                        f"Morgen um 00:00 Uhr zurückgesetzt."
                    ),
                },
            )
        locked_user.daily_creation_count += 1

    if "email" in update_data:
        update_data["email"] = current_user.email

    for key, value in update_data.items():
        setattr(alert, key, value)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_alert(
    request: Request,
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()


@router.post("/{alert_id}/run", response_model=dict)
@limiter.limit("10/minute")
async def run_alert_now(
    request: Request,
    alert_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Manually trigger a job alert search and send email."""
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    locked_user_result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    locked_user = locked_user_result.scalar_one()

    plan = await get_user_plan(db, current_user.id)
    run_limit = get_limit(plan, "daily_manual_runs")

    _ensure_daily_reset(locked_user)

    if run_limit != -1 and locked_user.daily_manual_run_count >= run_limit:
        # Snapshot the count BEFORE rollback. Rollback expires all ORM
        # attributes; touching `locked_user.daily_manual_run_count` afterwards
        # triggers a lazy SELECT that crashes outside an async greenlet ctx
        # (sqlalchemy.exc.MissingGreenlet on SA ≥ 2.0.40).
        used = locked_user.daily_manual_run_count
        await db.rollback()
        raise HTTPException(
            status_code=403,
            detail={
                "error": "daily_run_limit",
                "used": used,
                "limit": run_limit,
                "message": (
                    f"Tages-Limit für manuelle Ausführungen erreicht "
                    f"({used}/{run_limit}). "
                    f"Morgen um 00:00 Uhr zurückgesetzt."
                ),
            },
        )

    locked_user.daily_manual_run_count += 1
    await db.commit()
    await db.refresh(locked_user)

    background_tasks.add_task(
        _run_and_send,
        alert_id,
        alert.keywords,
        alert.location,
        alert.job_type,
        alert.email,
        current_user.id,
    )

    remaining = (run_limit - locked_user.daily_manual_run_count) if run_limit != -1 else -1
    return {
        "message": "Suche gestartet. Du erhältst in Kürze eine E-Mail.",
        "runs_used": locked_user.daily_manual_run_count,
        "runs_remaining": max(0, remaining) if remaining != -1 else -1,
    }


@router.post("/test-email", response_model=dict)
@limiter.limit("3/minute")
async def test_email(request: Request, current_user: User = Depends(get_current_user)) -> dict:
    """Send a test email to verify email configuration (Brevo or SMTP)."""
    from app.services.email_service import get_email_provider_status
    status = get_email_provider_status()
    if not status["active_provider"]:
        return {
            "ok": False,
            "error": "E-Mail-Versand ist nicht konfiguriert. Bitte kontaktiere den Support.",
            "provider_status": status,
        }

    fake_jobs = [
        {
            "title": "Test: Software Engineer",
            "company": "JobAssist GmbH",
            "location": "Wien",
            "full_url": "https://jobassist.tech",
            "salary_range": "€ 50.000 - 70.000",
        }
    ]
    ok = await asyncio.to_thread(
        send_job_alert_email,
        to_email=current_user.email,
        keywords="Test-Alert",
        location="Wien",
        jobs=fake_jobs,
    )
    return {
        "ok": ok,
        "to": current_user.email,
        "provider": status["active_provider"],
    }


class UnsubscribeRequest(BaseModel):
    token: str


@router.post("/unsubscribe", status_code=200)
@limiter.limit("10/minute")
async def unsubscribe(request: Request, payload: UnsubscribeRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """One-click unsubscribe from a job alert via signed token (no auth required)."""
    alert_id = _decode_unsubscribe_token(payload.token)
    result = await db.execute(select(JobAlert).where(JobAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert nicht gefunden")
    alert.is_active = False
    await db.commit()
    return {"message": "Du wurdest erfolgreich abgemeldet"}


async def _run_and_send(
    alert_id: int,
    keywords: str,
    location: str,
    job_type: str,
    email: str,
    manual_user_id: int | None = None,
):
    # The positional details are retained for compatibility with already
    # queued BackgroundTasks; the durable row is the source of truth.
    del keywords, location, job_type, email
    sent = await _deliver_alert(alert_id, force=True, use_cache=False)
    if not sent and manual_user_id is not None:
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(User)
                .where(User.id == manual_user_id)
                .values(
                    daily_manual_run_count=case(
                        (User.daily_manual_run_count > 0, User.daily_manual_run_count - 1),
                        else_=0,
                    )
                )
            )
            await session.commit()
    return sent


async def _claim_alert(
    alert_id: int,
    *,
    force: bool,
    sent_before: datetime | None = None,
) -> bool:
    now = datetime.now(timezone.utc)
    lease_expired = now - timedelta(minutes=15)
    conditions = [
        JobAlert.id == alert_id,
        JobAlert.is_active.is_(True),
        or_(JobAlert.claimed_at.is_(None), JobAlert.claimed_at <= lease_expired),
    ]
    if sent_before is not None:
        conditions.append(
            or_(JobAlert.last_sent_at.is_(None), JobAlert.last_sent_at <= sent_before)
        )
    if not force:
        conditions.append(
            or_(JobAlert.next_attempt_at.is_(None), JobAlert.next_attempt_at <= now)
        )

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(JobAlert)
            .where(*conditions)
            .values(
                delivery_status="in_flight",
                claimed_at=now,
                last_attempt_at=now,
                delivery_error=None,
            )
            .execution_options(synchronize_session=False)
        )
        await session.commit()
        return result.rowcount == 1


async def _finish_delivery(
    alert_id: int,
    *,
    status: str,
    error: str | None = None,
    retry_after: timedelta | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    values: dict = {
        "delivery_status": status,
        "claimed_at": None,
        "delivery_error": error[:500] if error else None,
        "next_attempt_at": now + retry_after if retry_after else None,
    }
    if status == "sent":
        values.update(last_sent_at=now, failure_count=0)
    elif status == "no_results":
        values.update(failure_count=0)
    else:
        values["failure_count"] = JobAlert.failure_count + 1

    async with AsyncSessionLocal() as session:
        await session.execute(
            update(JobAlert)
            .where(JobAlert.id == alert_id)
            .values(**values)
            .execution_options(synchronize_session=False)
        )
        await session.commit()


async def _deliver_alert(
    alert_id: int,
    *,
    force: bool = False,
    sent_before: datetime | None = None,
    use_cache: bool = False,
) -> bool:
    """Claim, deliver, and durably record one alert attempt."""
    if not await _claim_alert(alert_id, force=force, sent_before=sent_before):
        return False

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(JobAlert).where(JobAlert.id == alert_id))
            alert = result.scalar_one_or_none()
            if alert is None:
                return False
            details = {
                "keywords": alert.keywords,
                "location": alert.location or "",
                "job_type": alert.job_type or "",
                "email": alert.email,
                "failure_count": alert.failure_count,
            }

        results = await search_jobs(
            keywords=details["keywords"],
            location=details["location"],
            job_type=details["job_type"],
            page=1,
            use_cache=use_cache,
        )
        jobs = results.get("jobs", [])
        if not jobs:
            if results.get("error"):
                raise RuntimeError(str(results["error"]))
            await _finish_delivery(
                alert_id,
                status="no_results",
                retry_after=timedelta(hours=6),
            )
            return False

        token = _make_unsubscribe_token(alert_id)
        app_url = getattr(settings, "FRONTEND_URL", "https://jobassist.tech")
        sent = await asyncio.to_thread(
            send_job_alert_email,
            to_email=details["email"],
            keywords=details["keywords"],
            location=details["location"],
            jobs=jobs,
            unsubscribe_url=f"{app_url}/unsubscribe?token={token}",
        )
        if not sent:
            raise RuntimeError("Email provider did not confirm delivery")
        await _finish_delivery(alert_id, status="sent")
        logger.info("Job alert sent", extra={"alert_id": alert_id, "job_count": len(jobs)})
        return True
    except Exception as exc:
        failure_count = int(details.get("failure_count", 0)) if "details" in locals() else 0
        delay_minutes = min(360, 15 * (2 ** min(failure_count, 4)))
        await _finish_delivery(
            alert_id,
            status="failed",
            error=str(exc),
            retry_after=timedelta(minutes=delay_minutes),
        )
        logger.error("Alert delivery failed for alert %s: %s", alert_id, exc, exc_info=True)
        return False
