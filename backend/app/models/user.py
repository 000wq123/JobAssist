from sqlalchemy import Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    fingerprint: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Daily job-alert usage counters — reset at 00:00 UTC by the scheduler.
    # Stored on the user so that deleting/recreating alerts cannot reset the limits.
    daily_manual_run_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    daily_creation_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    daily_counts_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # User preferences
    currency: Mapped[str] = mapped_column(String, default="USD", nullable=False)  # USD, EUR, GBP, etc.
    location: Mapped[str] = mapped_column(String, default="United States", nullable=False)  # Country/City
    language: Mapped[str] = mapped_column(String, default="en", nullable=False)  # en, es, fr

    # v1 additions
    plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    notification_channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    phone_e164: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    profile_v2 = relationship("ProfileV2", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("JobAlert", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    push_subscriptions = relationship("WebPushSubscription", back_populates="user", cascade="all, delete-orphan")
    inbox_items = relationship("InboxItem", back_populates="user", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="user", cascade="all, delete-orphan")
