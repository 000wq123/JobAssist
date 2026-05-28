import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage, check_usage_limit, increment_usage
from app.core.rate_limit import limiter
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.job import JobCreate, JobListResponse, JobOut, JobStatusUpdate, JobNotesUpdate, JobDeadlineUpdate, JobUrlUpdate, JobResearchUpdate, PipelineStats, MatchRequest, CoursesRequest
from app.services.job_enrich import extract_metadata, extract_metadata_ai
from app.services.job_search import search_jobs, search_jobs_by_preferences
from app.services.claude_service import match_resume_to_job_async, suggest_courses_for_job

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory marker of jobs whose AI fallback has already been attempted in
# this process. Prevents re-hitting Groq on every GET when the description
# genuinely contains no extractable salary/location/deadline (extraction
# returns all-None → nothing is persisted → without this guard the route
# would call the LLM on every refresh). Resets on process restart, which is
# acceptable: at most one redundant attempt per job per restart.
_AI_ATTEMPTED: set[int] = set()


async def _get_resume_text(resume_id: int, user_id: int, db: AsyncSession) -> str:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume.raw_text


# ── Root routes ───────────────────────────────────────────────────────────────b 

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

    # Fill any scraper-field gaps from the description itself. Adzuna gives us
    # salary/location upfront, but URL-paste jobs and older saves arrive bare.
    # Heuristic extraction is regex-only — no AI cost, no failure to handle.
    extracted = extract_metadata(payload.description, role=payload.role)

    job = Job(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        description=payload.description,
        url=payload.url,
        resume_id=payload.resume_id,
        # Scraper-provided metadata wins; extractor fills the gaps.
        salary_text=payload.salary_text or extracted["salary_text"],
        location=payload.location or extracted["location"],
        job_type=payload.job_type,
        source=payload.source,
        source_id=payload.source_id,
        posted_at=payload.posted_at,
        expires_at=payload.expires_at or extracted["expires_at"],
        # Set explicit category if the classifier matched a known slug;
        # otherwise the model's `default="other"` kicks in.
        category=extracted["category"] or "other",
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

@router.post("/match")
async def match_job(request: Request):
    """Removed in v1 — match scoring is no longer supported."""
    raise HTTPException(status_code=410, detail="Match scoring removed in v1.")


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
    _usage_ctx=Depends(check_usage_limit("job_search")),
) -> dict:
    """Search jobs based on user's preferences. Usage is only charged when results are found."""
    try:
        logger.info(f"Recommended job search for user {current_user.email}")
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            logger.warning(f"No profile found for user {current_user.email}")
            return {"jobs": [], "total_count": 0, "error": "Bitte richte zuerst deine Jobpräferenzen in den Einstellungen ein."}

        profile_dict = {
            "desired_locations": profile.desired_locations or ["Wien"],
            "job_types": profile.job_types or [],
            "experience_level": profile.experience_level,
        }

        logger.info(f"Profile preferences: locations={profile_dict['desired_locations']}, types={profile_dict['job_types']}")
        results = await search_jobs_by_preferences(profile_dict, page)
        job_count = len(results.get("jobs", []))
        logger.info(f"Search results: {job_count} jobs found")
        if job_count > 0:
            await increment_usage(db, current_user.id, "job_search")
        return results
    except Exception as e:
        logger.error(f"Recommended search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Suche fehlgeschlagen. Bitte versuche es später erneut.")


@router.get("/search/custom", response_model=dict)
async def search_custom_jobs(
    keywords: str = Query(..., description="Job title or keywords", min_length=1, max_length=200),
    location: str = Query("", description="City/location", max_length=100),
    job_type: str = Query("", description="Job type (Full-time, Remote, etc.)", max_length=50),
    page: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage_ctx=Depends(check_usage_limit("job_search")),
) -> dict:
    """Search jobs with custom parameters. Usage is only charged when results are found."""
    try:
        logger.info(f"Custom job search: keywords={keywords}, location={location}, job_type={job_type}, user={current_user.email}")
        results = await search_jobs(
            keywords=keywords,
            location=location,
            job_type=job_type,
            page=page,
        )
        job_count = len(results.get("jobs", []))
        logger.info(f"Search results: {job_count} jobs found")
        if job_count > 0:
            await increment_usage(db, current_user.id, "job_search")
        return results
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Suche fehlgeschlagen. Bitte versuche es später erneut.")


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

    # Lazy backfill — jobs saved before the scraper-field pipeline was wired
    # arrive with salary_text / location / expires_at all NULL but a perfectly
    # good description sitting right there. We do this in two phases:
    #   1. Regex (microseconds) runs every time — cheap, idempotent.
    #   2. Groq AI fallback runs at most once per job per process lifetime,
    #      tracked by `_AI_ATTEMPTED`. Without this guard, jobs whose
    #      descriptions genuinely lack the data would re-call the LLM on
    #      every GET (regex returns None → nothing persists → next request
    #      sees the same NULL fields and triggers AI again).
    # `category="other"` is the model default — treat it as "untried"
    # alongside NULL when deciding whether to enrich.
    category_unset = (job.category or "other") == "other"
    structured_complete = (
        job.salary_text and job.location and job.expires_at and not category_unset
    )

    dirty = False

    if job.description and not structured_complete:
        # Phase 1: regex — always safe, always fast.
        regex_out = extract_metadata(job.description, role=job.role)
        logger.info(
            "job_enrich: job_id=%s regex salary=%r location=%r expires_at=%r category=%r",
            job.id, regex_out["salary_text"], regex_out["location"],
            regex_out["expires_at"], regex_out.get("category"),
        )

        if not job.salary_text and regex_out["salary_text"]:
            job.salary_text = regex_out["salary_text"]; dirty = True
        if not job.location and regex_out["location"]:
            job.location = regex_out["location"]; dirty = True
        if not job.expires_at and regex_out["expires_at"]:
            job.expires_at = regex_out["expires_at"]; dirty = True
        if category_unset and regex_out.get("category"):
            job.category = regex_out["category"]; dirty = True
            category_unset = False

        # Re-check completeness after regex pass.
        structured_complete = (
            job.salary_text and job.location and job.expires_at and not category_unset
        )

        # Phase 2: AI fallback — gated by per-process attempt set so we never
        # re-call Groq for the same job in this process.
        if not structured_complete and job.id not in _AI_ATTEMPTED:
            _AI_ATTEMPTED.add(job.id)
            try:
                ai_out = await extract_metadata_ai(job.description, role=job.role)
            except Exception as e:                            # noqa: BLE001
                logger.warning("job_enrich: job_id=%s AI raised: %s", job.id, e)
                ai_out = {
                    "salary_text": None, "location": None,
                    "expires_at": None, "category": None,
                }
            logger.info(
                "job_enrich: job_id=%s AI salary=%r location=%r expires_at=%r category=%r",
                job.id, ai_out["salary_text"], ai_out["location"],
                ai_out["expires_at"], ai_out.get("category"),
            )
            if not job.salary_text and ai_out["salary_text"]:
                job.salary_text = ai_out["salary_text"]; dirty = True
            if not job.location and ai_out["location"]:
                job.location = ai_out["location"]; dirty = True
            if not job.expires_at and ai_out["expires_at"]:
                job.expires_at = ai_out["expires_at"]; dirty = True
            if category_unset and ai_out.get("category"):
                job.category = ai_out["category"]; dirty = True
        elif not structured_complete:
            logger.info(
                "job_enrich: job_id=%s AI skipped (already attempted this process)",
                job.id,
            )

    if dirty:
        logger.info("job_enrich: job_id=%s persisting enrichment", job.id)
        await db.commit()
        await db.refresh(job)

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


@router.post("/{job_id}/match", response_model=JobOut)
@limiter.limit("10/minute")
async def run_match_score(
    request: Request,
    job_id: int,
    payload: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("cv_analysis")),
) -> Job:
    """Score how well the user's resume matches the job and persist the result."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = res_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not job.description:
        raise HTTPException(status_code=400, detail="Job has no description to match against")

    feedback = await match_resume_to_job_async(
        resume_text=resume.raw_text or "",
        job_description=job.description,
    )

    job.match_score = feedback.get("score")
    job.match_feedback = __import__("json").dumps({
        "strengths":       feedback.get("strengths", []),
        "gaps":            feedback.get("gaps", []),
        "summary":         feedback.get("summary", ""),
        "recommendations": feedback.get("recommendations", []),
        "requirements":    feedback.get("requirements", []),
        "score_rationale": feedback.get("score_rationale", ""),
        "verdict":         feedback.get("verdict", ""),
    }, ensure_ascii=False)
    await db.commit()
    await db.refresh(job)
    logger.info("match: job_id=%s score=%s user=%s", job_id, job.match_score, current_user.email)
    return job


@router.post("/{job_id}/courses", response_model=JobOut)
@limiter.limit("10/minute")
async def generate_courses(
    request: Request,
    job_id: int,
    payload: CoursesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("cv_analysis")),
) -> Job:
    """Generate course suggestions for a job and persist them."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.description:
        raise HTTPException(status_code=400, detail="Job has no description")

    resume_text = ""
    if payload.resume_id:
        res_result = await db.execute(
            select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        )
        resume = res_result.scalar_one_or_none()
        if resume:
            resume_text = resume.raw_text or ""

    courses = await suggest_courses_for_job(
        description=job.description,
        role=job.role or "",
        resume_text=resume_text,
    )

    job.suggested_courses = __import__("json").dumps(courses, ensure_ascii=False)
    await db.commit()
    await db.refresh(job)
    logger.info("courses: job_id=%s count=%s user=%s", job_id, len(courses), current_user.email)
    return job
