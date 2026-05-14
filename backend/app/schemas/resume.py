from pydantic import BaseModel, computed_field, Field
from datetime import datetime
from typing import Optional


class ResumeOut(BaseModel):
    id: int
    filename: str
    created_at: datetime
    skill_analysis_json: Optional[str] = Field(default=None, exclude=True)

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def has_skill_analysis(self) -> bool:
        return self.skill_analysis_json is not None


class ResumeAnalysis(BaseModel):
    resume_id: int
    parsed_json: Optional[str]


class ResumeSkillAnalysis(BaseModel):
    tech: int
    exp: int
    edu: int
    soft: int
    lang: int
    summary: str
