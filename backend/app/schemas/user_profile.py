import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

# ~300 KB base64 ~= ~225 KB decoded; enough for a 200x200 JPEG, blocks DB bloat
_AVATAR_MAX_LEN = 400_000
_AVATAR_PATTERN = re.compile(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$")


class UserProfileUpdate(BaseModel):
    desired_locations: Optional[list[str]] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_types: Optional[list[str]] = None
    industries: Optional[list[str]] = None
    experience_level: Optional[str] = None
    is_open_to_relocation: Optional[bool] = None
    avatar: Optional[str] = None

    @field_validator("salary_min", "salary_max")
    @classmethod
    def salary_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Gehalt darf nicht negativ sein")
        return v

    @field_validator("avatar")
    @classmethod
    def avatar_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > _AVATAR_MAX_LEN:
            raise ValueError(f"Avatar darf maximal {_AVATAR_MAX_LEN // 1000} KB groß sein")
        if not _AVATAR_PATTERN.match(v):
            raise ValueError("Ungültiges Bildformat. Nur JPEG, PNG und WebP als Base64-Data-URL erlaubt")
        return v

    @model_validator(mode="after")
    def salary_range_valid(self) -> "UserProfileUpdate":
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("Mindestgehalt darf nicht höher als das Höchstgehalt sein")
        return self


class UserProfileOut(BaseModel):
    id: int
    user_id: int
    desired_locations: list[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    job_types: list[str]
    industries: list[str]
    experience_level: Optional[str]
    is_open_to_relocation: bool
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
