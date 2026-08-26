"""ProfileV2 (Austrian CV builder) routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sa_delete, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage, increment_usage
from app.models.cv_library_entry import CvLibraryEntry
from app.models.profile_v2 import ProfileV2
from app.models.user import User
from app.schemas.cv_library import CvLibraryEntryIn, CvLibraryOut, CvLibraryPut
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

    if profile:
        return profile

    # Return a transient default object without mutating the database
    now = datetime.now(timezone.utc)
    return ProfileV2Out(
        id=0,
        user_id=current_user.id,
        vorname=None,
        nachname=None,
        geburtsdatum=None,
        geburtsort=None,
        strasse=None,
        plz=None,
        ort=None,
        telefon=None,
        email=None,
        staatsbuergerschaft="",
        arbeitserlaubnis=None,
        schulname=None,
        schultyp=None,
        klasse=None,
        abschlussjahr=None,
        erfahrungen=[],
        sprachkenntnisse=[],
        faehigkeiten=[],
        hobbies=None,
        foto_url=None,
        profil=None,
        fuehrerschein=None,
        jobArten=[],
        maxAnfahrtMin=None,
        branchen=[],
        verfuegbarAb=None,
        weiterbildungen=[],
        aktivitaeten=[],
        templateId=None,
        completion_pct=0,
        created_at=now,
        updated_at=now,
    )


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

    # Completion heuristic — kept in sync with frontend cv/completion.js
    _arr = lambda v: v if v is not None else []
    slots = [
        profile.vorname, profile.nachname, profile.geburtsdatum,
        profile.plz and profile.ort,
        profile.telefon, profile.email,
        profile.schulname, profile.schultyp,
        _arr(profile.erfahrungen) if len(_arr(profile.erfahrungen)) > 0 else None,
        _arr(profile.sprachkenntnisse) if len(_arr(profile.sprachkenntnisse)) > 0 else None,
        _arr(profile.faehigkeiten) if len(_arr(profile.faehigkeiten)) > 0 else None,
        profile.hobbies,
        _arr(profile.jobArten) if len(_arr(profile.jobArten)) > 0 else None,
        _arr(profile.branchen) if len(_arr(profile.branchen)) > 0 else None,
    ]
    filled = sum(1 for s in slots if s)
    profile.completion_pct = min(100, int((filled / len(slots)) * 100))

    await db.commit()
    await db.refresh(profile)
    return profile


def _entry_to_out(row: CvLibraryEntry) -> dict:
    """Map a CvLibraryEntry row to the frontend's `cv_library_v1` shape."""
    return {
        "id": row.entry_id,
        "name": row.name,
        "templateId": row.template_id,
        "createdAt": row.created_at_client,
        "profile": row.profile or {},
    }


@router.get("/cv-library", response_model=CvLibraryOut)
async def get_cv_library(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CvLibraryOut:
    """Return the user's saved CV library (mirror of `cv_library_v1`).

    Insertion order is preserved (newest first, as the client sends it), so
    the SPA can merge by id without re-sorting.
    """
    result = await db.execute(
        select(CvLibraryEntry)
        .where(CvLibraryEntry.user_id == current_user.id)
        .order_by(CvLibraryEntry.id)
    )
    return CvLibraryOut(entries=[_entry_to_out(r) for r in result.scalars().all()])


@router.put("/cv-library", response_model=CvLibraryOut)
async def put_cv_library(
    payload: CvLibraryPut,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CvLibraryOut:
    """Replace the user's CV library with the client's full list.

    The client owns the list (it edits locally and syncs), so this is a
    simple delete-all + insert in one transaction. Max 10 entries (schema-
    enforced) keeps the payload small; the global 5 MiB body cap applies
    per request.
    """
    await db.execute(
        sa_delete(CvLibraryEntry).where(CvLibraryEntry.user_id == current_user.id)
    )
    saved: list[CvLibraryEntry] = []
    for entry in payload.entries:
        row = CvLibraryEntry(
            user_id=current_user.id,
            entry_id=entry.id,
            name=entry.name,
            template_id=entry.templateId,
            created_at_client=entry.createdAt,
            profile=entry.profile,
        )
        db.add(row)
        saved.append(row)
    await db.commit()
    return CvLibraryOut(entries=[_entry_to_out(r) for r in saved])


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
