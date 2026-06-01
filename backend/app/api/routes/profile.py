"""ProfileV2 (Austrian CV builder) routes."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage, increment_usage
from app.models.profile_v2 import ProfileV2
from app.models.user import User
from app.schemas.profile_v2 import ProfileV2Out, ProfileV2Update

router = APIRouter()


class CVGenerateResponse(BaseModel):
    ok: bool
    remaining: int


@router.get("/me", response_model=ProfileV2Out)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileV2:
    """Get the current user's CV builder profile. Auto-creates if missing."""
    result = await db.execute(
        select(ProfileV2).where(ProfileV2.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = ProfileV2(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.patch("/me", response_model=ProfileV2Out)
async def patch_my_profile(
    payload: ProfileV2Update,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileV2:
    """Upsert the current user's CV builder profile."""
    result = await db.execute(
        select(ProfileV2).where(ProfileV2.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = ProfileV2(user_id=current_user.id)
        db.add(profile)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    # Simple completion heuristic
    required_fields = ["vorname", "nachname", "schulname", "schultyp"]
    filled = sum(1 for f in required_fields if getattr(profile, f))
    profile.completion_pct = min(100, int((filled / len(required_fields)) * 100))

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/cv/generate", response_model=CVGenerateResponse)
async def generate_cv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("cv_generate")),
) -> CVGenerateResponse:
    """Consume one CV PDF generation credit and return remaining count.

    The actual PDF is rendered client-side; this endpoint enforces
    server-side rate limits so credits cannot be bypassed in localStorage.
    """
    from app.core.plans import get_limit
    from app.core.usage import get_user_plan, get_usage_count

    plan = await get_user_plan(db, current_user.id)
    limit = get_limit(plan, "cv_generate")
    if limit == -1:
        return CVGenerateResponse(ok=True, remaining=-1)

    count = await get_usage_count(db, current_user.id, "cv_generate")
    remaining = max(0, limit - count)
    return CVGenerateResponse(ok=True, remaining=remaining)
