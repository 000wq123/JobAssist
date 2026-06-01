from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core import usage


class FakeResult:
    def __init__(self, *, fetchone_result=None, scalar_result=None):
        self._fetchone_result = fetchone_result
        self._scalar_result = scalar_result

    def fetchone(self):
        return self._fetchone_result

    def scalar_one_or_none(self):
        return self._scalar_result

    def scalar(self):
        return self._scalar_result


@pytest.mark.asyncio
async def test_require_usage_blocks_unverified_users_before_db_work():
    db = AsyncMock()
    current_user = SimpleNamespace(id=1, is_verified=False)

    checker = usage.require_usage("cover_letter")

    with pytest.raises(HTTPException) as exc:
        await checker(db=db, current_user=current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "email_not_verified"
    db.execute.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_commits_when_under_limit(monkeypatch):
    # We mock `get_usage_count` and `increment_usage` so this test exercises
    # only the require_usage() control flow, not the recursive SQLite
    # increment path (which would call db.execute multiple times).
    db = AsyncMock()
    current_user = SimpleNamespace(id=7, is_verified=True)

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: 3)
    monkeypatch.setattr(usage, "get_usage_count", AsyncMock(return_value=2))
    increment_mock = AsyncMock()
    monkeypatch.setattr(usage, "increment_usage", increment_mock)

    checker = usage.require_usage("cover_letter")
    await checker(db=db, current_user=current_user)

    increment_mock.assert_awaited_once_with(db, 7, "cover_letter")
    db.rollback.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_rolls_back_and_raises_at_limit(monkeypatch):
    db = AsyncMock()
    current_user = SimpleNamespace(id=9, is_verified=True)

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: 3)
    # current_count == limit → hits the "row is None" branch
    monkeypatch.setattr(usage, "get_usage_count", AsyncMock(return_value=3))
    increment_mock = AsyncMock()
    monkeypatch.setattr(usage, "increment_usage", increment_mock)

    checker = usage.require_usage("cover_letter")

    with pytest.raises(HTTPException) as exc:
        await checker(db=db, current_user=current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "usage_limit"
    assert exc.value.detail["limit"] == 3
    db.rollback.assert_awaited_once()
    increment_mock.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_unlimited_plan_uses_increment_usage(monkeypatch):
    db = AsyncMock()
    current_user = SimpleNamespace(id=5, is_verified=True)
    increment_mock = AsyncMock()

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="max"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: -1)
    monkeypatch.setattr(usage, "increment_usage", increment_mock)

    checker = usage.require_usage("ai_chat")
    await checker(db=db, current_user=current_user)

    increment_mock.assert_awaited_once_with(db, 5, "ai_chat")
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_or_trial_allows_first_trial_for_unverified():
    db = AsyncMock()
    current_user = SimpleNamespace(id=2, is_verified=False, trial_used=False)

    checker = usage.require_usage_or_trial("cv_analysis")
    await checker(db=db, current_user=current_user)

    assert current_user.trial_used is True
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_require_usage_or_trial_blocks_second_trial_for_unverified():
    db = AsyncMock()
    current_user = SimpleNamespace(id=3, is_verified=False, trial_used=True)

    checker = usage.require_usage_or_trial("cv_analysis")

    with pytest.raises(HTTPException) as exc:
        await checker(db=db, current_user=current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "email_not_verified"
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_or_trial_delegates_to_require_usage_when_verified(monkeypatch):
    db = AsyncMock()
    current_user = SimpleNamespace(id=4, is_verified=True, trial_used=False)
    increment_mock = AsyncMock()

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: 3)
    monkeypatch.setattr(usage, "get_usage_count", AsyncMock(return_value=1))
    monkeypatch.setattr(usage, "increment_usage", increment_mock)

    checker = usage.require_usage_or_trial("cv_analysis")
    await checker(db=db, current_user=current_user)

    increment_mock.assert_awaited_once_with(db, 4, "cv_analysis")
    db.commit.assert_awaited()
