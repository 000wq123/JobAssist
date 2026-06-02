"""profile_v2_missing_fields

Add columns missing from the initial profiles_v2 table so that the
frontend CV wizard data (job preferences, activities, courses, etc.)
is actually persisted instead of silently dropped.

Revision ID: 20260601_0007
Revises: 20260531_0006
Create Date: 2026-06-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260601_0007"
down_revision: Union[str, None] = "20260531_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Persönliches ─────────────────────────────────────────────────────────
    op.add_column("profiles_v2", sa.Column("geburtsort", sa.String(100), nullable=True))

    # ── Meta / Profil ────────────────────────────────────────────────────────
    op.add_column("profiles_v2", sa.Column("profil", sa.Text(), nullable=True))
    op.add_column("profiles_v2", sa.Column("fuehrerschein", sa.String(20), nullable=True))

    # ── Suche / Präferenzen ──────────────────────────────────────────────────
    op.add_column(
        "profiles_v2",
        sa.Column("job_arten", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column(
        "profiles_v2",
        sa.Column("branchen", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column("profiles_v2", sa.Column("max_anfahrt_min", sa.SmallInteger(), nullable=True))
    op.add_column("profiles_v2", sa.Column("verfuegbar_ab", sa.String(20), nullable=True))

    # ── Weiterbildung / Aktivitäten ─────────────────────────────────────────
    op.add_column(
        "profiles_v2",
        sa.Column("weiterbildungen", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column(
        "profiles_v2",
        sa.Column("aktivitaeten", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )

    # ── Vorlage ──────────────────────────────────────────────────────────────
    op.add_column("profiles_v2", sa.Column("template_id", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles_v2", "template_id")
    op.drop_column("profiles_v2", "aktivitaeten")
    op.drop_column("profiles_v2", "weiterbildungen")
    op.drop_column("profiles_v2", "verfuegbar_ab")
    op.drop_column("profiles_v2", "max_anfahrt_min")
    op.drop_column("profiles_v2", "branchen")
    op.drop_column("profiles_v2", "job_arten")
    op.drop_column("profiles_v2", "fuehrerschein")
    op.drop_column("profiles_v2", "profil")
    op.drop_column("profiles_v2", "geburtsort")
