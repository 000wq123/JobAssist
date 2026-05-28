from sqlalchemy import Integer, SmallInteger, String, Text, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional

from app.core.database import Base


class KvWage(Base):
    """Kollektivvertrag wage data for the Lohnrechner (wage advisor).

    Amounts stored as integer euro-cents to avoid float rounding.
    category examples: 'Lehrling_Einzelhandel', 'Teilzeit_Gastronomie', 'Praktikum_IT'
    region: ISO 3166-2:AT subdivision code or 'AT' for federal.
    """

    __tablename__ = "kv_wages"
    __table_args__ = (
        UniqueConstraint("category", "region", "year", name="uq_kv_category_region_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(String(50), nullable=False, default="AT")
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    kollektivvertrag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hourly_min_cent: Mapped[int] = mapped_column(Integer, nullable=False)
    hourly_max_cent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
