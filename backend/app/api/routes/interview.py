import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.schemas.job import InterviewPrepRequest, JobOut
from app.services.claude_service import generate_interview_prep
from app.core.rate_limit import limiter

router = APIRouter()


@router.post("/generate", response_model=JobOut)
@limiter.limit("10/minute")
async def generate(
    request: Request,
    payload: InterviewPrepRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
) -> Job:
    result = await db.execute(
        select(Job).where(Job.id == payload.job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not payload.resume_id:
        raise HTTPException(status_code=400, detail="resume_id is required")

    res_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = res_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    qa_list = await asyncio.to_thread(
        generate_interview_prep,
        resume_text=resume.raw_text,
        job_description=job.description or "",
        num_questions=payload.num_questions,
    )

    job.interview_qa = json.dumps(qa_list)
    await db.commit()
    await db.refresh(job)
    return job
