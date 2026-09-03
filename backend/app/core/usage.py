"""Usage tracking: check limits and increment counters."""

import asyncio
from datetime import date

from fastapi import Depends, HTTPException
from sqlalchemy import select, update as sa_update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, engine
from app.core.plans import get_limit
from app.core.security import get_current_user
from app.models.subscription import Subscription
from app.models.usage import UsageRecord
from app.models.user import User

# Serialises the SQLite TOCTOU check-then-increment path.
# PostgreSQL uses atomic DB-level upserts so this lock is never acquired there.
_sqlite_usage_lock = asyncio.Lock()

_is_pg = engine.dialect.name == "postgresql"


DAILY_FEATURES = {"job_search"}


def _current_period_start() -> date:
    today = date.today()
    return today.replace(day=1)


def _period_for(feature: str) -> date:
    return date.today() if feature in DAILY_FEATURES else _current_period_start()


async def get_user_plan(db: AsyncSession, user_id: int) -> str:
    result = await db.execute(
        select(Subscription.plan).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(["active", "trialing"]),
        )
    )
    plan = result.scalar_one_or_none()
    return plan or "basic"


async def get_usage_count(db: AsyncSession, user_id: int, feature: str) -> int:
    period = _period_for(feature)
    result = await db.execute(
        select(UsageRecord.count).where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.period_start == period,
        )
    )
    return result.scalar_one_or_none() or 0


async def increment_usage(db: AsyncSession, user_id: int, feature: str) -> None:
    period = _period_for(feature)
    if _is_pg:
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = pg_insert(UsageRecord).values(
            user_id=user_id,
            feature=feature,
            period_start=period,
            count=1,
        ).on_conflict_do_update(
            constraint="uq_user_feature_period",
            set_={"count": UsageRecord.count + 1},
        )
        await db.execute(stmt)
    else:
        current = await get_usage_count(db, user_id, feature)
        if current:
            await db.execute(
                sa_update(UsageRecord).where(
                    UsageRecord.user_id == user_id,
                    UsageRecord.feature == feature,
                    UsageRecord.period_start == period,
                ).values(count=UsageRecord.count + 1)
            )
        else:
            try:
                db.add(UsageRecord(user_id=user_id, feature=feature, period_start=period, count=1))
                await db.flush()
            except IntegrityError:
                # A concurrent request inserted the row first; update instead.
                await db.rollback()
                await db.execute(
                    sa_update(UsageRecord).where(
                        UsageRecord.user_id == user_id,
                        UsageRecord.feature == feature,
                        UsageRecord.period_start == period,
                    ).values(count=UsageRecord.count + 1)
                )
    await db.commit()


async def decrement_usage(db: AsyncSession, user_id: int, feature: str) -> None:
    """Release one reserved usage unit after downstream work fails."""
    period = _period_for(feature)
    await db.rollback()
    await db.execute(
        sa_update(UsageRecord)
        .where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.period_start == period,
            UsageRecord.count > 0,
        )
        .values(count=UsageRecord.count - 1)
    )
    await db.commit()


async def _reserve_usage(db: AsyncSession, current_user: User, feature: str) -> None:
    """Atomically reserve one unit before work starts."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "email_not_verified",
                "message": "Bitte bestätige zuerst deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
            },
        )

    plan = await get_user_plan(db, current_user.id)
    limit = get_limit(plan, feature)

    if limit == -1:
        await increment_usage(db, current_user.id, feature)
        return

    period = _period_for(feature)
    if _is_pg:
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        stmt = (
            pg_insert(UsageRecord)
            .values(
                user_id=current_user.id,
                feature=feature,
                period_start=period,
                count=1,
            )
            .on_conflict_do_update(
                constraint="uq_user_feature_period",
                set_={"count": UsageRecord.count + 1},
                where=UsageRecord.count < limit,
            )
            .returning(UsageRecord.count)
        )
        result = await db.execute(stmt)
        row = result.fetchone()
    else:
        async with _sqlite_usage_lock:
            current_count = await get_usage_count(db, current_user.id, feature)
            if current_count >= limit:
                row = None
            else:
                await increment_usage(db, current_user.id, feature)
                row = (current_count + 1,)

    if row is None:
        await db.rollback()
        raise HTTPException(
            status_code=403,
            detail={
                "error": "usage_limit",
                "feature": feature,
                "plan": plan,
                "used": await get_usage_count(db, current_user.id, feature),
                "limit": limit,
                "message": f"Du hast dein Limit für diese Funktion erreicht ({limit}/{limit}). Bitte upgrade deinen Plan.",
            },
        )

    if _is_pg:
        await db.commit()


def require_usage(feature: str):
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        user_id = current_user.id
        await _reserve_usage(db, current_user, feature)
        try:
            yield
        except BaseException:
            await decrement_usage(db, user_id, feature)
            raise

    return _check


def require_usage_or_trial(feature: str, max_trials: int = 1):
    """Dependency: enforce usage limits, but allow unverified users a limited trial.

    If the user is verified, this behaves exactly like `require_usage`.
    If unverified and trial_used < max_trials, consume one trial and allow.
    If unverified and trial exhausted, raise 403 demanding email verification.
    """
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        user_id = current_user.id
        if current_user.is_verified:
            # Delegate to standard usage check for verified users
            checker = require_usage(feature)
            async for _reservation in checker(db=db, current_user=current_user):
                try:
                    yield
                except BaseException:
                    raise
            return

        # Atomically reserve the single trial so concurrent first requests
        # cannot both pass the boolean check.
        result = await db.execute(
            sa_update(User)
            .where(User.id == user_id, User.trial_used.is_(False))
            .values(trial_used=True)
        )
        if result.rowcount != 1:
            await db.rollback()
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "email_not_verified",
                    "message": "Bitte bestätige zuerst deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
                },
            )

        current_user.trial_used = True
        await db.commit()
        try:
            yield
        except BaseException:
            await db.rollback()
            await db.execute(
                sa_update(User)
                .where(User.id == user_id, User.trial_used.is_(True))
                .values(trial_used=False)
            )
            await db.commit()
            current_user.trial_used = False
            raise

    return _check


def check_usage_limit(feature: str):
    """Dependency: verify the user is within their limit but do NOT increment.

    Use this for streaming endpoints where the increment should be deferred until
    the first successful chunk is delivered, preventing phantom charges on API failure.
    Returns (db, user_id, feature) so the caller can call increment_usage() later.
    """
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> tuple[AsyncSession, int, str]:
        if not current_user.is_verified:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "email_not_verified",
                    "message": "Bitte bestätige zuerst deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
                },
            )
        plan = await get_user_plan(db, current_user.id)
        limit = get_limit(plan, feature)
        if limit != -1:
            count = await get_usage_count(db, current_user.id, feature)
            if count >= limit:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "usage_limit",
                        "feature": feature,
                        "plan": plan,
                        "used": count,
                        "limit": limit,
                        "message": f"Du hast dein Limit für diese Funktion erreicht ({count}/{limit}). Bitte upgrade deinen Plan.",
                    },
                )
        return db, current_user.id, feature

    return _check


async def get_all_usage(db: AsyncSession, user_id: int, plan: str) -> list[dict]:
    from sqlalchemy import func as sa_func
    from app.models.job_alert import JobAlert

    features = ["cv_analysis", "cover_letter", "job_alerts", "ai_chat", "job_search"]
    monthly_period = _current_period_start()
    daily_period = date.today()

    monthly_features = [f for f in features if f not in DAILY_FEATURES]
    daily_features_list = [f for f in features if f in DAILY_FEATURES]

    if monthly_features:
        monthly_rows = await db.execute(
            select(UsageRecord.feature, UsageRecord.count).where(
                UsageRecord.user_id == user_id,
                UsageRecord.feature.in_(monthly_features),
                UsageRecord.period_start == monthly_period,
            )
        )
    else:
        monthly_rows = []

    if daily_features_list:
        daily_rows = await db.execute(
            select(UsageRecord.feature, UsageRecord.count).where(
                UsageRecord.user_id == user_id,
                UsageRecord.feature.in_(daily_features_list),
                UsageRecord.period_start == daily_period,
            )
        )
    else:
        daily_rows = []
    alert_count_result = await db.execute(
        select(sa_func.count()).where(JobAlert.user_id == user_id)
    )

    counts = {
        row.feature: row.count
        for rows in (monthly_rows, daily_rows)
        for row in rows
    }

    alert_count = alert_count_result.scalar() or 0

    result = []
    for feature in features:
        used = alert_count if feature == "job_alerts" else counts.get(feature, 0)
        limit = get_limit(plan, feature)
        result.append({
          "feature": feature,
          "used": used,
          "limit": limit,
          "remaining": -1 if limit == -1 else max(0, limit - used),
        })
    return result
