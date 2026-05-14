from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.routes import settings as settings_routes
from app.schemas.user import UserPreferencesUpdate
from app.schemas.user_profile import UserProfileUpdate


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, scalar_one=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._scalar_one = scalar_one

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalar_one(self):
        return self._scalar_one


@pytest.mark.asyncio
async def test_get_profile_creates_default_profile_when_missing():
    db = AsyncMock()
    db.add = MagicMock()
    current_user = SimpleNamespace(id=1)
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))
    db.refresh = AsyncMock()

    result = await settings_routes.get_profile(db=db, current_user=current_user)

    assert result.user_id == 1
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_profile_only_updates_profile_fields():
    profile = SimpleNamespace(
        user_id=1,
        desired_locations=["Vienna"],
        salary_min=40,
        salary_max=60,
        job_types=["full-time"],
        industries=["tech"],
        experience_level="mid",
        is_open_to_relocation=False,
        avatar=None,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=profile))
    db.refresh = AsyncMock()

    payload = UserProfileUpdate(
        desired_locations=["Graz"],
        salary_min=50,
        is_open_to_relocation=True,
    )

    result = await settings_routes.update_profile(
        payload=payload,
        db=db,
        current_user=SimpleNamespace(id=1),
    )

    assert result.desired_locations == ["Graz"]
    assert result.salary_min == 50
    assert result.salary_max == 60
    assert result.is_open_to_relocation is True
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(profile)


@pytest.mark.asyncio
async def test_update_profile_rolls_back_on_commit_failure():
    profile = SimpleNamespace(
        user_id=1,
        desired_locations=[],
        salary_min=None,
        salary_max=None,
        job_types=[],
        industries=[],
        experience_level=None,
        is_open_to_relocation=False,
        avatar=None,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=profile))
    db.commit = AsyncMock(side_effect=Exception("db failed"))

    with pytest.raises(HTTPException) as exc:
        await settings_routes.update_profile(
            payload=UserProfileUpdate(desired_locations=["Linz"]),
            db=db,
            current_user=SimpleNamespace(id=1),
        )

    assert exc.value.status_code == 422
    assert exc.value.detail == "Profil konnte nicht gespeichert werden"
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_preferences_only_updates_preference_fields():
    user = SimpleNamespace(
        id=1,
        email="user@example.com",
        full_name="Test User",
        is_active=True,
        is_verified=True,
        created_at=datetime(2026, 3, 26, 12, 0, 0),
        currency="USD",
        location="United States",
        language="en",
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one=user))
    db.refresh = AsyncMock()

    payload = UserPreferencesUpdate(currency="eur", location="Vienna", language="de")

    result = await settings_routes.update_preferences(
        payload=payload,
        db=db,
        current_user=SimpleNamespace(id=1),
    )

    assert result.currency == "EUR"
    assert result.location == "Vienna"
    assert result.language == "de"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)
