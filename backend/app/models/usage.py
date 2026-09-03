from sqlalchemy import ForeignKey, Index, Integer, String, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date

from app.core.database import Base


class UsageRecord(Base):
    __tablename__ = "usage_tracking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    feature: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("user_id", "feature", "period_start", name="uq_user_feature_period"),
        Index("idx_usage_period_feature", "period_start", "feature"),
    )
