import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage
from app.core.rate_limit import limiter
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.job import JobCreate, JobListResponse, JobOut, MatchRequest, JobStatusUpdate, JobNotesUpdate, JobDeadlineUpdate, JobUrlUpdate, JobResearchUpdate, PipelineStats
from app.services.claude_service import match_resume_to_job
from app.services.job_search import search_jobs, search_jobs_by_preferences

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_resume_text(resume_id: int, user_id: int, db: AsyncSession) -> str:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume.raw_text


# ── Root routes ────────────────────────────────────────────────────────────────

MAX_JOBS_PER_USER = 500  # hard cap to prevent unbounded loads


@router.post("/", response_model=JobOut, status_code=201)
@limiter.limit("30/minute")
async def create_job(
    request: Request,
    payload: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.resume_id:
        r = await db.execute(select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Resume not found")

    # Upsert: return existing job if same URL already saved for this user
    if payload.url:
        existing = await db.execute(
            select(Job).where(Job.user_id == current_user.id, Job.url == payload.url)
        )
        existing_job = existing.scalar_one_or_none()
        if existing_job:
            return JSONResponse(
                status_code=200,
                content=JobOut.model_validate(existing_job).model_dump(mode="json"),
            )

    # Enforce per-user job cap to prevent unbounded list growth & runaway storage
    count_result = await db.execute(
        select(sa_func.count()).select_from(Job).where(Job.user_id == current_user.id)
    )
    current_count = count_result.scalar() or 0
    if current_count >= MAX_JOBS_PER_USER:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "job_cap_reached",
                "limit": MAX_JOBS_PER_USER,
                "message": (
                    f"Du hast die maximale Anzahl an gespeicherten Stellen erreicht "
                    f"({MAX_JOBS_PER_USER}). Bitte lösche alte Einträge, bevor du neue speicherst."
                ),
            },
        )

    job = Job(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        description=payload.description,
        url=payload.url,
        resume_id=payload.resume_id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    base_filter = [Job.user_id == current_user.id]
    if status:
        base_filter.append(Job.status == status)

    total: int = (
        await db.execute(
            select(sa_func.count()).select_from(Job).where(*base_filter)
        )
    ).scalar() or 0

    result = await db.execute(
        select(Job)
        .where(*base_filter)
        .order_by(Job.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    pages = (total + page_size - 1) // page_size if total > 0 else 0

    return JobListResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


# ── Static routes BEFORE /{job_id} to avoid Starlette path conflicts ──────────

@router.post("/match", response_model=JobOut)
@limiter.limit("10/minute")
async def match_job(
    request: Request,
    payload: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Run resume-to-job match scoring via Claude."""
    result = await db.execute(
        select(Job)
        .where(Job.id == payload.job_id, Job.user_id == current_user.id)
        .with_for_update()
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not payload.resume_id:
        raise HTTPException(status_code=400, detail="resume_id is required")

    resume_text = await _get_resume_text(payload.resume_id, current_user.id, db)
    match = await asyncio.to_thread(match_resume_to_job, resume_text, job.description or "")

    job.match_score = match.get("score")
    job.match_feedback = json.dumps(match)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/pipeline/stats", response_model=PipelineStats)
async def get_pipeline_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Get application pipeline statistics."""
    result = await db.execute(
        select(Job.status, sa_func.count())
        .where(Job.user_id == current_user.id)
        .group_by(Job.status)
    )
    counts = {row[0]: row[1] for row in result.all()}
    total = sum(counts.values())

    return {
        "bookmarked": counts.get("bookmarked", 0),
        "applied": counts.get("applied", 0),
        "interviewing": counts.get("interviewing", 0),
        "offered": counts.get("offered", 0),
        "rejected": counts.get("rejected", 0),
        "total": total,
    }


@router.get("/search/recommended", response_model=dict)
async def search_recommended_jobs(
    page: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("job_search")),
) -> dict:
    """Search jobs based on user's preferences."""
    try:
        logger.info(f"Recommended job search for user {current_user.email}")
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            logger.warning(f"No profile found for user {current_user.email}")
            return {"jobs": [], "total_count": 0, "error": "Please set up your preferences first"}

        profile_dict = {
            "desired_locations": profile.desired_locations or ["Remote"],
            "job_types": profile.job_types or ["Full-time"],
            "experience_level": profile.experience_level,
        }

        logger.info(f"Profile preferences: locations={profile_dict['desired_locations']}, types={profile_dict['job_types']}")
        results = await search_jobs_by_preferences(profile_dict, page)
        logger.info(f"Search results: {len(results.get('jobs', []))} jobs found")
        return results
    except Exception as e:
        logger.error(f"Recommended search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed. Please try again later.")


@router.get("/search/custom", response_model=dict)
async def search_custom_jobs(
    keywords: str = Query(..., description="Job title or keywords", min_length=1, max_length=200),
    location: str = Query("", description="City/location", max_length=100),
    job_type: str = Query("", description="Job type (Full-time, Remote, etc.)", max_length=50),
    page: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("job_search")),
) -> dict:
    """Search jobs with custom parameters."""
    try:
        logger.info(f"Custom job search: keywords={keywords}, location={location}, job_type={job_type}, user={current_user.email}")
        results = await search_jobs(
            keywords=keywords,
            location=location,
            job_type=job_type,
            page=page,
        )
        logger.info(f"Search results: {len(results.get('jobs', []))} jobs found")
        return results
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed. Please try again later.")


# ── Dynamic /{job_id} routes AFTER all static routes ──────────────────────────

@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_job(
    request: Request,
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()


@router.patch("/{job_id}/status", response_model=JobOut)
@limiter.limit("30/minute")
async def update_job_status(
    request: Request,
    job_id: int,
    payload: JobStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Update job application status."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = payload.status
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} status updated to {payload.status} by user {current_user.email}")
    return job


@router.patch("/{job_id}/notes", response_model=JobOut)
@limiter.limit("30/minute")
async def update_job_notes(
    request: Request,
    job_id: int,
    payload: JobNotesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Update job notes."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.notes = payload.notes
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} notes updated by user {current_user.email}")
    return job


@router.patch("/{job_id}/deadline", response_model=JobOut)
@limiter.limit("30/minute")
async def update_job_deadline(
    request: Request,
    job_id: int,
    payload: JobDeadlineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Update job deadline."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.deadline = payload.deadline
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} deadline updated by user {current_user.email}")
    return job


@router.patch("/{job_id}/url", response_model=JobOut)
@limiter.limit("30/minute")
async def update_job_url(
    request: Request,
    job_id: int,
    payload: JobUrlUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Update job URL."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.url = payload.url
    await db.commit()
    await db.refresh(job)
    return job


@router.patch("/{job_id}/research", response_model=JobOut)
@limiter.limit("30/minute")
async def update_job_research(
    request: Request,
    job_id: int,
    payload: JobResearchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    """Save research data to a job."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.research_data = payload.research_data
    await db.commit()
    await db.refresh(job)
    return job
