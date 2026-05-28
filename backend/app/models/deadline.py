from sqlalchemy import Index, Integer, String, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import Optional

from app.core.database import Base


class Deadline(Base):
    """Application-cycle calendar entry.

    user_id=NULL means a global/system deadline (e.g. Lehrling season opens).
    job_id links the deadline to a specific saved job.
    source: 'user' | 'system' | 'alert'
    category: 'lehrling' | 'praktikum' | 'teilzeit' | 'samstagsjob'
    """

    __tablename__ = "deadlines"
    __table_args__ = (
        Index("idx_deadlines_closes_on", "closes_on"),
        Index("idx_deadlines_user_closes", "user_id", "closes_on"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    job_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    closes_on: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="deadlines")
    job = relationship("Job", back_populates="deadlines")
