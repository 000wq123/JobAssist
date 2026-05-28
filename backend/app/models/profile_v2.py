from sqlalchemy import Integer, String, Text, Boolean, SmallInteger, Date, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import Optional

from app.core.database import Base


class ProfileV2(Base):
    """Austrian-specific CV builder profile (v1 replacement for UserProfile)."""

    __tablename__ = "profiles_v2"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # ── Persönliches ─────────────────────────────────────────────────────────
    vorname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    nachname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    geburtsdatum: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    strasse: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    plz: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    ort: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefon: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email_kontakt: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    staatsbuergerschaft: Mapped[str] = mapped_column(String(100), nullable=False, default="AT")
    arbeitserlaubnis: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── Schule ───────────────────────────────────────────────────────────────
    schulname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    schultyp: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    klasse: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    abschlussjahr: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    # ── Erfahrungen / Sprachen / Fähigkeiten ─────────────────────────────────
    erfahrungen: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    sprachkenntnisse: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    faehigkeiten: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    hobbies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    foto_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Meta ─────────────────────────────────────────────────────────────────
    completion_pct: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="profile_v2")
