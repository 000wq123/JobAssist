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
    # email = public-facing API name; DB column keeps legacy name for zero-downtime.
    email: Mapped[Optional[str]] = mapped_column("email_kontakt", String(255), nullable=True)
    staatsbuergerschaft: Mapped[str] = mapped_column(String(100), nullable=False, default="AT")
    arbeitserlaubnis: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    geburtsort: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

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
    profil: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fuehrerschein: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # ── Suche / Präferenzen ──────────────────────────────────────────────────
    jobArten: Mapped[list] = mapped_column("job_arten", JSON, nullable=False, default=list)
    branchen: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    maxAnfahrtMin: Mapped[Optional[int]] = mapped_column("max_anfahrt_min", SmallInteger, nullable=True)
    verfuegbarAb: Mapped[Optional[str]] = mapped_column("verfuegbar_ab", String(20), nullable=True)

    # ── Weiterbildung / Aktivitäten ──────────────────────────────────────────
    weiterbildungen: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    aktivitaeten: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # ── Vorlage / Meta ───────────────────────────────────────────────────────
    templateId: Mapped[Optional[str]] = mapped_column("template_id", String(50), nullable=True)
    accentColor: Mapped[str] = mapped_column("accent_color", String(7), nullable=False, default="#C8102E")
    fontFamily: Mapped[str] = mapped_column("font_family", String(10), nullable=False, default="sans")
    showPhoto: Mapped[bool] = mapped_column("show_photo", Boolean, nullable=False, default=True)
    completion_pct: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="profile_v2")
