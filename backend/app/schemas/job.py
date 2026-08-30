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
    # Scraper-sourced fields. Optional on purpose — manual job creation still
    # works without them; Finden's "Speichern" passes them through so the
    # detail page can render the wage hero, KPI tiles, and KV bar without a
    # second round-trip.
    salary_text: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    job_type: Optional[str] = Field(None, max_length=50)
    source: Optional[str] = Field(None, max_length=50)
    source_id: Optional[str] = Field(None, max_length=255)
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

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


class JobListItem(BaseModel):
    """Lightweight schema for list views — excludes large TEXT blobs."""

    id: int
    company: Optional[str]
    role: Optional[str]
    url: Optional[str]
    status: str  # bookmarked, applied, interviewing, offered, rejected
    category: Optional[str] = None
    deadline: Optional[datetime]
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary_text: Optional[str] = None
    source: Optional[str] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobOut(BaseModel):
    id: int
    company: Optional[str]
    role: Optional[str]
    description: Optional[str]
    url: Optional[str]
    status: str  # bookmarked, applied, interviewing, offered, rejected
    category: Optional[str] = None  # samstagsjob, praktikum, teilzeit, other
    cover_letter: Optional[str]
    interview_qa: Optional[str]
    suggested_courses: Optional[str] = None
    research_data: Optional[str] = None
    notes: Optional[str]
    applied_at: Optional[datetime] = None
    deadline: Optional[datetime]
    # Scraper-sourced fields (exposed for new hero design)
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary_text: Optional[str] = None
    source: Optional[str] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
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


class CoverLetterRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    tone: Optional[str] = "professional"  # professional, enthusiastic, concise


class InterviewPrepRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    num_questions: int = 10


class InterviewRateRequest(BaseModel):
    question: str = Field(..., max_length=1000)
    user_answer: str = Field(..., max_length=3000)
    suggested_answer: str = Field(..., max_length=3000)


class InterviewRateFeedback(BaseModel):
    score: str
    strong: list[str]
    improve: list[str]
    tip: str


class CoursesRequest(BaseModel):
    resume_id: Optional[int] = None


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
    items: list["JobListItem"]
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
