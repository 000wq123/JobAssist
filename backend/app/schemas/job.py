import json as _json
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal, Optional
from urllib.parse import urlparse


class JobCreate(BaseModel):
    company: Optional[str] = Field(None, max_length=200)
    role: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=50000)
    url: Optional[str] = Field(None, max_length=2000)
    resume_id: Optional[int] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if v is None:
            return v
        try:
            parsed = urlparse(v)
            if parsed.scheme not in ("http", "https"):
                raise ValueError("URL must start with http:// or https://")
        except Exception:
            raise ValueError("Invalid URL")
        return v


class JobOut(BaseModel):
    id: int
    company: Optional[str]
    role: Optional[str]
    description: Optional[str]
    url: Optional[str]
    status: str  # bookmarked, applied, interviewing, offered, rejected
    match_score: Optional[float]
    match_feedback: Optional[str]
    cover_letter: Optional[str]
    interview_qa: Optional[str]
    research_data: Optional[str] = None
    notes: Optional[str]
    deadline: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobResearchUpdate(BaseModel):
    research_data: Optional[str] = Field(None, max_length=50000)

    @field_validator("research_data")
    @classmethod
    def validate_json(cls, v):
        if v is None:
            return v
        try:
            _json.loads(v)
        except _json.JSONDecodeError as e:
            raise ValueError(f"research_data must be valid JSON: {e}")
        return v


class MatchRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None


class CoverLetterRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    tone: Optional[str] = "professional"  # professional, enthusiastic, concise


class InterviewPrepRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    num_questions: int = 10


class JobStatusUpdate(BaseModel):
    status: Literal["bookmarked", "applied", "interviewing", "offered", "rejected"]


class JobNotesUpdate(BaseModel):
    notes: Optional[str] = Field(None, max_length=10000)


class JobDeadlineUpdate(BaseModel):
    deadline: Optional[datetime] = None


class JobUrlUpdate(BaseModel):
    url: Optional[str] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if v is None:
            return v
        try:
            parsed = urlparse(v)
            if parsed.scheme not in ("http", "https"):
                raise ValueError("URL must start with http:// or https://")
        except Exception:
            raise ValueError("Invalid URL")
        return v


class JobListResponse(BaseModel):
    items: list["JobOut"]
    total: int
    page: int
    page_size: int
    pages: int


class PipelineStats(BaseModel):
    bookmarked: int = 0
    applied: int = 0
    interviewing: int = 0
    offered: int = 0
    rejected: int = 0
    total: int = 0
