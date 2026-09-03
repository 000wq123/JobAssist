from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional


class JobAlertCreate(BaseModel):
    keywords: str = Field(..., min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=100)
    job_type: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    frequency: Literal["daily", "weekly"] = "daily"


class JobAlertUpdate(BaseModel):
    keywords: Optional[str] = Field(None, min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=100)
    job_type: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    frequency: Optional[Literal["daily", "weekly"]] = None
    is_active: Optional[bool] = None


class JobAlertOut(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    job_type: Optional[str]
    email: str
    frequency: str
    is_active: bool
    last_sent_at: Optional[datetime]
    delivery_status: str = "idle"
    last_attempt_at: Optional[datetime] = None
    next_attempt_at: Optional[datetime] = None
    failure_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobAlertListResponse(BaseModel):
    """Wraps the alert list with user-level daily usage so the frontend can
    enforce limits without a second round-trip."""
    alerts: list[JobAlertOut]
    daily_manual_run_count: int
    daily_creation_count: int
    daily_manual_run_limit: int   # -1 = unlimited
    daily_creation_limit: int     # -1 = unlimited
