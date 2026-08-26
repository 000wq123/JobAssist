"""Server-side mirror of the CV builder's saved-CV library.

The frontend keeps a local `cv_library_v1` snapshot list (max 10, newest
first) so the builder works offline. Each entry is a self-contained CV
profile snapshot. These rows let the same library follow a user across
devices: the client PUTs its full list on every mutation and merges the
server list on boot.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CvLibraryEntry(Base):
    __tablename__ = "cv_library_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Client-generated id (kept stable so the SPA can dedupe/merge).
    entry_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Lebenslauf")
    template_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Client-side ISO timestamp of when the snapshot was created.
    created_at_client: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    # Full CV profile snapshot (JSON) — shape owned by the frontend.
    profile: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
