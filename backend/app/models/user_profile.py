from sqlalchemy import Integer, String, Float, Boolean, ForeignKey, DateTime, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Location preferences
    desired_locations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # ["New York", "San Francisco"]

    # Salary
    salary_min: Mapped[float] = mapped_column(Float, nullable=True)  # in thousands
    salary_max: Mapped[float] = mapped_column(Float, nullable=True)

    # Job preferences
    job_types: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # ["Full-time", "Remote", "Contract"]
    industries: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # ["Tech", "Finance", "Healthcare"]
    experience_level: Mapped[str] = mapped_column(String, nullable=True)  # "Entry", "Mid", "Senior", "Lead"

    # Additional
    is_open_to_relocation: Mapped[bool] = mapped_column(Boolean, default=False)

    # Profile photo stored as base64 data URL (e.g. "data:image/jpeg;base64,...")
    avatar: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")
