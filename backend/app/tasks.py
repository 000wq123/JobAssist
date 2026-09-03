"""Background scheduler tasks.

All long-running schedulers live here so `app/main.py` is purely wiring.
Each task is wrapped in a Postgres advisory lock so it runs at-most-once
across multi-worker deployments — see `app.core.advisory_lock`.
"""
from __future__ import annotations

import asyncio
import logging
import traceback
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import select, update

from app.core import metrics
from app.core.advisory_lock import try_advisory_lock
from app.core.database import AsyncSessionLocal
from app.models.user import User

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


# ── Stale-user cleanup ───────────────────────────────────────────────────────
async def delete_stale_unverified_users() -> None:
    """Delete unverified accounts older than 24 h.

    Wrapped in a Postgres advisory lock so only one worker performs the
    cleanup per tick, even when running multiple gunicorn workers.
    """
    async with try_advisory_lock("scheduler.delete_stale_unverified_users") as acquired:
        if not acquired:
            return
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(
                    User.is_verified.is_(False),
                    User.created_at < cutoff,
                )
            )
            stale_users = result.scalars().all()
            if not stale_users:
                return
            for user in stale_users:
                await session.delete(user)
            await session.commit()
            logger.info("Deleted stale unverified users", extra={"count": len(stale_users)})


async def stale_user_cleanup_loop() -> None:
    while True:
        try:
            await delete_stale_unverified_users()
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "stale_user_cleanup", "outcome": "ok"},
            )
        except Exception:
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "stale_user_cleanup", "outcome": "error"},
            )
            traceback.print_exc()
        await asyncio.sleep(60 * 60)


# ── Job alert scheduler ──────────────────────────────────────────────────────
# In-process re-entrancy guard: prevents a slow scheduler run from overlapping
# with the next hourly tick within the same worker. Cross-worker coordination
# is handled by the Postgres advisory lock around `_run_due_job_alerts_inner`.
_scheduler_lock = asyncio.Lock()


async def run_due_job_alerts() -> None:
    """Find alerts due for sending and dispatch them.

    Two layers of safety:
      • `_scheduler_lock` (asyncio.Lock) — prevents overlap within a worker.
      • `try_advisory_lock` (Postgres) — prevents two workers from both
        dispatching the same tick across multi-instance deployments.
    """
    if _scheduler_lock.locked():
        logger.warning("job_alert_scheduler: previous run still in progress — skipping this tick")
        return

    async with _scheduler_lock:
        async with try_advisory_lock("scheduler.run_due_job_alerts") as acquired:
            if not acquired:
                logger.info("job_alert_scheduler: another worker already dispatching this tick")
                return
            await _run_due_job_alerts_inner()


async def _run_due_job_alerts_inner() -> None:
    from app.api.routes.job_alerts import _deliver_alert
    from app.models.job_alert import JobAlert

    now = datetime.now(timezone.utc)
    BATCH = 100
    offset = 0

    while True:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(JobAlert)
                .where(JobAlert.is_active.is_(True))
                .order_by(JobAlert.id)
                .limit(BATCH)
                .offset(offset)
            )
            alerts = result.scalars().all()
        if not alerts:
            break
        offset += len(alerts)

        for alert in alerts:
            try:
                last = alert.last_sent_at
                if last and last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)

                if alert.frequency == "daily":
                    due = last is None or (now - last).total_seconds() >= 86_400
                    threshold = now - timedelta(seconds=86_400)
                elif alert.frequency == "weekly":
                    due = last is None or (now - last).total_seconds() >= 604_800
                    threshold = now - timedelta(seconds=604_800)
                else:
                    due = False
                    threshold = now

                if not due:
                    continue

                await _deliver_alert(
                    alert.id,
                    sent_before=threshold,
                    use_cache=False,
                )
            except Exception:
                traceback.print_exc()


async def job_alert_scheduler_loop() -> None:
    """Check for due alerts every hour.

    Runs immediately on startup so alerts are not delayed by up to an hour
    after a server restart or deployment."""
    while True:
        try:
            await run_due_job_alerts()
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "job_alert", "outcome": "ok"},
            )
        except Exception:
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "job_alert", "outcome": "error"},
            )
            traceback.print_exc()
        await asyncio.sleep(60 * 60)


# ── Daily usage-counter reset ────────────────────────────────────────────────
async def reset_daily_alert_counts() -> None:
    """Reset daily_manual_run_count + daily_creation_count to 0 for every user.

    Guarded by an advisory lock so only one worker performs the reset.
    """
    async with try_advisory_lock("scheduler.reset_daily_alert_counts") as acquired:
        if not acquired:
            return
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(User).values(
                    daily_manual_run_count=0,
                    daily_creation_count=0,
                    daily_counts_reset_at=today_start,
                )
            )
            await session.commit()
        logger.info("Daily alert usage counts reset for all users")


async def daily_count_reset_loop() -> None:
    """Sleep until the next 00:00 UTC, reset daily counts, then repeat."""
    while True:
        now = datetime.now(timezone.utc)
        next_midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        await asyncio.sleep((next_midnight - now).total_seconds())
        try:
            await reset_daily_alert_counts()
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "daily_count_reset", "outcome": "ok"},
            )
        except Exception:
            metrics.inc(
                "jobassist_scheduler_runs_total",
                labels={"task": "daily_count_reset", "outcome": "error"},
            )
            traceback.print_exc()


__all__ = [
    "delete_stale_unverified_users",
    "stale_user_cleanup_loop",
    "run_due_job_alerts",
    "job_alert_scheduler_loop",
    "reset_daily_alert_counts",
    "daily_count_reset_loop",
]
