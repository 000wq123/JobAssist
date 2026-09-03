from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes import job_alerts
from app.core.database import Base
from app.models.job_alert import JobAlert
from app.models.user import User
from app.schemas.job_alert import JobAlertCreate, JobAlertUpdate


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, scalar_one=None, scalar=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._scalar_one = scalar_one
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalar_one(self):
        return self._scalar_one

    def scalar(self):
        return self._scalar


def _today_start():
    """Return today's midnight UTC as a naive datetime (matches _ensure_daily_reset logic)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


@pytest.mark.asyncio
async def test_create_alert_uses_user_email_not_payload(monkeypatch):
    today = _today_start()
    locked_user = SimpleNamespace(
        id=1,
        email="user@example.com",
        daily_manual_run_count=0,
        daily_creation_count=0,
        daily_counts_reset_at=today,
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(scalar_one=locked_user),
        ]
    )
    db.refresh = AsyncMock(side_effect=lambda obj: None)

    monkeypatch.setattr(job_alerts, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(job_alerts, "get_limit", lambda plan, feature: -1)

    added = []
    def capture_add(obj):
        added.append(obj)
    db.add.side_effect = capture_add

    payload = JobAlertCreate(
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="attacker@example.com",
        frequency="daily",
    )

    await job_alerts.create_alert(
        payload=payload,
        db=db,
        current_user=SimpleNamespace(id=1, email="user@example.com"),
    )

    assert added, "alert should be added to the session"
    assert added[0].email == "user@example.com"
    assert db.commit.await_count == 1


@pytest.mark.asyncio
async def test_update_alert_enforces_rewrite_cooldown():
    recent = datetime.now(timezone.utc).replace(tzinfo=None)
    alert = SimpleNamespace(
        id=4,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        frequency="daily",
        email="user@example.com",
        is_active=True,
        created_at=recent - timedelta(hours=1),
        updated_at=recent - timedelta(minutes=30),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=alert))
    current_user = SimpleNamespace(id=1)

    payload = JobAlertUpdate(keywords="golang")

    with pytest.raises(HTTPException) as exc:
        await job_alerts.update_alert(alert_id=4, payload=payload, db=db, current_user=current_user)

    assert exc.value.status_code == 429
    assert "Verfügbar" in exc.value.detail
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_update_alert_allows_non_rewrite_fields_without_cooldown():
    recent = datetime.now(timezone.utc).replace(tzinfo=None)
    alert = SimpleNamespace(
        id=4,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        frequency="daily",
        email="user@example.com",
        is_active=True,
        created_at=recent - timedelta(hours=1),
        updated_at=recent - timedelta(minutes=30),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=alert))
    current_user = SimpleNamespace(id=1)
    payload = JobAlertUpdate(is_active=False)

    result = await job_alerts.update_alert(alert_id=4, payload=payload, db=db, current_user=current_user)

    assert result.is_active is False
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(alert)


@pytest.mark.asyncio
async def test_run_alert_now_increments_usage_and_returns_remaining(monkeypatch):
    alert = SimpleNamespace(
        id=5,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="user@example.com",
    )
    today = _today_start()
    user = SimpleNamespace(
        id=1,
        daily_manual_run_count=0,
        daily_creation_count=0,
        daily_counts_reset_at=today,
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(scalar_one_or_none=alert),
            FakeResult(scalar_one=user),
        ]
    )
    db.refresh = AsyncMock(side_effect=lambda obj: None)
    background = BackgroundTasks()

    monkeypatch.setattr(job_alerts, "_run_and_send", AsyncMock())
    monkeypatch.setattr(job_alerts, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(job_alerts, "get_limit", lambda plan, feature: 3)

    result = await job_alerts.run_alert_now(
        request=SimpleNamespace(),
        alert_id=5,
        background_tasks=background,
        db=db,
        current_user=SimpleNamespace(id=1),
    )

    assert result["runs_used"] == 1
    assert result["runs_remaining"] == 2
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_alert_now_rejects_when_limit_reached(monkeypatch):
    alert = SimpleNamespace(
        id=5,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="user@example.com",
    )
    today = _today_start()
    user = SimpleNamespace(
        id=1,
        daily_manual_run_count=3,
        daily_creation_count=0,
        daily_counts_reset_at=today,
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(scalar_one_or_none=alert),
            FakeResult(scalar_one=user),
        ]
    )

    monkeypatch.setattr(job_alerts, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(job_alerts, "get_limit", lambda plan, feature: 3)

    with pytest.raises(HTTPException) as exc:
        await job_alerts.run_alert_now(
            request=SimpleNamespace(),
            alert_id=5,
            background_tasks=BackgroundTasks(),
            db=db,
            current_user=SimpleNamespace(id=1),
        )

    assert exc.value.status_code == 403
    assert "Tages-Limit" in exc.value.detail["message"]
    db.rollback.assert_awaited_once()
    db.commit.assert_not_called()


@pytest_asyncio.fixture
async def delivery_env(tmp_path, monkeypatch):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'delivery.db'}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    monkeypatch.setattr(job_alerts, "AsyncSessionLocal", session_factory)
    try:
        yield session_factory
    finally:
        await engine.dispose()


async def _seed_delivery_alert(session_factory, *, manual_runs: int = 0) -> tuple[int, int]:
    async with session_factory() as session:
        user = User(
            email="delivery@example.com",
            hashed_password="hashed",
            is_verified=True,
            daily_manual_run_count=manual_runs,
        )
        session.add(user)
        await session.flush()
        alert = JobAlert(
            user_id=user.id,
            keywords="python",
            location="Wien",
            email=user.email,
            frequency="daily",
        )
        session.add(alert)
        await session.commit()
        return user.id, alert.id


@pytest.mark.asyncio
async def test_delivery_marks_sent_only_after_provider_success(delivery_env, monkeypatch):
    _user_id, alert_id = await _seed_delivery_alert(delivery_env)
    monkeypatch.setattr(
        job_alerts,
        "search_jobs",
        AsyncMock(return_value={"jobs": [{"title": "Python Praktikum"}]}),
    )
    monkeypatch.setattr(job_alerts, "send_job_alert_email", lambda **_kwargs: True)

    assert await job_alerts._deliver_alert(alert_id) is True

    async with delivery_env() as session:
        alert = await session.get(JobAlert, alert_id)
        assert alert.last_sent_at is not None
        assert alert.delivery_status == "sent"
        assert alert.claimed_at is None
        assert alert.failure_count == 0


@pytest.mark.asyncio
async def test_provider_failure_keeps_alert_unsent_and_schedules_retry(delivery_env, monkeypatch):
    _user_id, alert_id = await _seed_delivery_alert(delivery_env)
    monkeypatch.setattr(
        job_alerts,
        "search_jobs",
        AsyncMock(return_value={"jobs": [{"title": "Python Praktikum"}]}),
    )
    monkeypatch.setattr(job_alerts, "send_job_alert_email", lambda **_kwargs: False)

    assert await job_alerts._deliver_alert(alert_id) is False

    async with delivery_env() as session:
        alert = await session.get(JobAlert, alert_id)
        assert alert.last_sent_at is None
        assert alert.delivery_status == "failed"
        assert alert.claimed_at is None
        assert alert.next_attempt_at is not None
        assert alert.failure_count == 1


@pytest.mark.asyncio
async def test_manual_failure_refunds_reserved_daily_run(delivery_env, monkeypatch):
    user_id, alert_id = await _seed_delivery_alert(delivery_env, manual_runs=1)
    monkeypatch.setattr(job_alerts, "search_jobs", AsyncMock(return_value={"jobs": []}))

    sent = await job_alerts._run_and_send(
        alert_id,
        "python",
        "Wien",
        "",
        "delivery@example.com",
        user_id,
    )

    assert sent is False
    async with delivery_env() as session:
        user = await session.get(User, user_id)
        alert = await session.get(JobAlert, alert_id)
        assert user.daily_manual_run_count == 0
        assert alert.last_sent_at is None
        assert alert.delivery_status == "no_results"
