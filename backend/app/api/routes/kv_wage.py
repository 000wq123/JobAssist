"""KV wage (Kollektivvertrag) lookup routes.

Provides Austrian minimum-wage and KV-bracket data per job category.
Data is seeded automatically on first access in dev/SQLite and can be
backfilled via the admin seed endpoint in production.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.kv_wage import KvWage
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Seed data ──────────────────────────────────────────────────────────
# Austrian statutory minimum + typical KV floors for teen-relevant categories.
# Stored as integer euro-cents.  Year = 2025.
_KV_SEED = [
    # category, region, year, kollektivvertrag, hourly_min_cent, hourly_max_cent
    ("teilzeit",    "AT", 2025, "KV Angestellte",       1209, 1650),
    ("vollzeit",    "AT", 2025, "KV Angestellte",       1209, 1650),
    ("samstagsjob", "AT", 2025, "KV Handel",            1209, 1450),
    ("geringfügig", "AT", 2025, "KV Angestellte",       1209, 1450),
    ("lehre",       "AT", 2025, "KV Lehre",               375,  800),
    ("praktikum",   "AT", 2025, "Gesetzliches Minimum", 1209, 1450),
    ("ferialjob",   "AT", 2025, "KV Handel",            1050, 1209),
]


async def _ensure_seed(db: AsyncSession) -> None:
    """Insert seed rows if the table is empty. Idempotent."""
    result = await db.execute(select(KvWage.id).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    for row in _KV_SEED:
        db.add(
            KvWage(
                category=row[0],
                region=row[1],
                year=row[2],
                kollektivvertrag=row[3],
                hourly_min_cent=row[4],
                hourly_max_cent=row[5],
            )
        )
    await db.commit()
    logger.info("kv_wages seeded", extra={"count": len(_KV_SEED)})


# ── Response schema (plain dict, keeps file dependency-free) ─────────


@router.get("/")
async def list_kv_wages(
    category: Optional[str] = Query(None, description="Filter by category slug"),
    year: int = Query(2025, description="Wage year"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Return all KV wage records, optionally filtered by category and year."""
    await _ensure_seed(db)

    stmt = select(KvWage).where(KvWage.year == year)
    if category:
        stmt = stmt.where(KvWage.category == category.lower())

    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "category": r.category,
            "region": r.region,
            "year": r.year,
            "kollektivvertrag": r.kollektivvertrag,
            "hourly_min": r.hourly_min_cent / 100,
            "hourly_max": (r.hourly_max_cent / 100) if r.hourly_max_cent else None,
        }
        for r in rows
    ]


@router.get("/{category}")
async def get_kv_wage(
    category: str,
    year: int = Query(2025, description="Wage year"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return a single KV wage record for the given category and year."""
    await _ensure_seed(db)

    result = await db.execute(
        select(KvWage).where(
            KvWage.category == category.lower(),
            KvWage.year == year,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="KV-Daten nicht gefunden")

    return {
        "category": row.category,
        "region": row.region,
        "year": row.year,
        "kollektivvertrag": row.kollektivvertrag,
        "hourly_min": row.hourly_min_cent / 100,
        "hourly_max": (row.hourly_max_cent / 100) if row.hourly_max_cent else None,
    }
