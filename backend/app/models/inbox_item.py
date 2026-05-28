from sqlalchemy import Index, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.core.database import Base


class InboxItem(Base):
    """Dismissible dashboard card / in-app notification.

    kind values: 'new_match', 'follow_up', 'deadline_soon', 'digest', 'system'
    ref_id: optional FK to a jobs.id or job_alerts.id depending on kind.
    """

    __tablename__ = "inbox_items"
    __table_args__ = (
        Index("idx_inbox_user_status", "user_id", "is_read", "snoozed_until"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    snoozed_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="inbox_items")
