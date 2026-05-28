"""Add suggested_courses to jobs

Revision ID: 20260523_0003
Revises: 20260517_0002
Create Date: 2026-05-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260523_0003"
down_revision: Union[str, None] = "20260517_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("suggested_courses", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "suggested_courses")
