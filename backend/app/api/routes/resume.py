from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from app.core.rate_limit import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage, require_usage_or_trial
from app.models.user import User
from app.models.resume import Resume
from app.models.job import Job
import asyncio
from app.schemas.resume import ResumeOut, ResumeAnalysis, ResumeSkillAnalysis
from app.services.resume_parser import extract_resume_text
from app.services.claude_service import parse_resume, analyze_resume_skills

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_RAW_TEXT_LENGTH = 100_000  # 100k chars — prevents unbounded DB growth
MAX_RESUMES_PER_USER = 10
PDF_PARSE_TIMEOUT_SECONDS = 10


def _sanitize_filename(name: str) -> str:
    """Strip path traversal and control characters from uploaded filenames."""
    import os
    import re

    base = os.path.basename(name)
    return re.sub(r"[^\w.\-]", "_", base)[:120]


@router.post("/upload", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("cv_analysis")),
) -> Resume:
    # Chunked read — abort as soon as bytes exceed the limit to save RAM.
    # This prevents a malicious client from forcing the server to buffer a huge file.
    CHUNK = 64 * 1024  # 64 KB
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Datei zu groß (max. 5 MB)")
        chunks.append(chunk)
    file_bytes = b"".join(chunks)

    try:
        # PDF parsing is CPU-bound and malformed PDFs can be expensive. Keep it
        # off the event loop and cap how long the request waits for it.
        raw_text = await asyncio.wait_for(
            asyncio.to_thread(extract_resume_text, file.filename, file_bytes),
            timeout=PDF_PARSE_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        raise HTTPException(status_code=408, detail="PDF processing timed out")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if len(raw_text) > MAX_RAW_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Resume text too long (max {MAX_RAW_TEXT_LENGTH:,} characters after extraction)")

    # Parse with Claude
    parsed = await asyncio.to_thread(parse_resume, raw_text)

    # Enforce per-user resume count limit
    count_result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id)
    )
    if len(count_result.scalars().all()) >= MAX_RESUMES_PER_USER:
        raise HTTPException(status_code=429, detail=f"Maximal {MAX_RESUMES_PER_USER} Lebensläufe erlaubt. Lösche einen alten, um einen neuen hochzuladen.")

    resume = Resume(
        user_id=current_user.id,
        filename=_sanitize_filename(file.filename),
        raw_text=raw_text,
        parsed_json=json.dumps(parsed),
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/", response_model=list[ResumeOut])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Resume]:
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{resume_id}", response_model=ResumeAnalysis)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeAnalysis:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeAnalysis(resume_id=resume.id, parsed_json=resume.parsed_json)


@router.post("/{resume_id}/analyze", response_model=ResumeSkillAnalysis)
@limiter.limit("10/minute")
async def analyze_resume(
    request: Request,
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage_or_trial("cv_analysis")),
) -> ResumeSkillAnalysis:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    parsed = {}
    try:
        parsed = json.loads(resume.parsed_json or "{}")
    except json.JSONDecodeError:
        pass

    analysis = await asyncio.to_thread(analyze_resume_skills, resume.raw_text, parsed)
    resume.skill_analysis_json = json.dumps(analysis)
    await db.commit()
    return analysis


@router.delete("/{resume_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_resume(
    request: Request,
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(Job).where(Job.resume_id == resume_id).values(resume_id=None)
    )
    await db.delete(resume)
    await db.commit()
