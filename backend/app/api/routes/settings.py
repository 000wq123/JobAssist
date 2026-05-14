from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileUpdate, UserProfileOut
from app.schemas.user import UserOut, UserPreferencesUpdate

router = APIRouter()


@router.get("/profile", response_model=UserProfileOut)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfile:
    """Get user's profile and preferences."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Create default profile if it doesn't exist
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.put("/profile", response_model=UserProfileOut)
async def update_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfile:
    """Update user's profile and preferences.
    Returns 422 automatically for invalid salary values (via Pydantic validators).
    """
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    # Update only known safe fields explicitly
    update_data = payload.model_dump(exclude_unset=True)
    if "desired_locations" in update_data:    profile.desired_locations    = update_data["desired_locations"]
    if "salary_min" in update_data:           profile.salary_min           = update_data["salary_min"]
    if "salary_max" in update_data:           profile.salary_max           = update_data["salary_max"]
    if "job_types" in update_data:            profile.job_types            = update_data["job_types"]
    if "industries" in update_data:           profile.industries           = update_data["industries"]
    if "experience_level" in update_data:     profile.experience_level     = update_data["experience_level"]
    if "is_open_to_relocation" in update_data: profile.is_open_to_relocation = update_data["is_open_to_relocation"]
    if "avatar" in update_data:               profile.avatar               = update_data["avatar"]

    try:
        await db.commit()
        await db.refresh(profile)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Profil konnte nicht gespeichert werden")

    return profile


@router.get("/preferences", response_model=UserOut)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Get user's preferences (currency, location, language)."""
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


@router.put("/preferences", response_model=UserOut)
async def update_preferences(
    payload: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Update user's preferences (currency, location, language)."""
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one()

    # Update only known safe fields explicitly
    update_data = payload.model_dump(exclude_unset=True)
    if "currency" in update_data:  user.currency = update_data["currency"]
    if "location" in update_data:  user.location = update_data["location"]
    if "language" in update_data:  user.language = update_data["language"]

    await db.commit()
    await db.refresh(user)
    return user
