"""add durable job alert delivery state

Revision ID: 20260902_0014
Revises: 20260902_0013
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260902_0014"
down_revision: Union[str, None] = "20260902_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "job_alerts",
        sa.Column("delivery_status", sa.String(length=20), nullable=False, server_default="idle"),
    )
    op.add_column("job_alerts", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("job_alerts", sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("job_alerts", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("job_alerts", sa.Column("delivery_error", sa.String(length=500), nullable=True))
    op.add_column(
        "job_alerts",
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("job_alerts", "failure_count")
    op.drop_column("job_alerts", "delivery_error")
    op.drop_column("job_alerts", "next_attempt_at")
    op.drop_column("job_alerts", "last_attempt_at")
    op.drop_column("job_alerts", "claimed_at")
    op.drop_column("job_alerts", "delivery_status")
