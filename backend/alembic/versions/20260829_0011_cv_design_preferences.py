"""persist CV design preferences

Revision ID: 20260829_0011
Revises: 20260826_0010
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260829_0011"
down_revision: Union[str, None] = "20260826_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles_v2",
        sa.Column("accent_color", sa.String(length=7), nullable=False, server_default="#C8102E"),
    )
    op.add_column(
        "profiles_v2",
        sa.Column("font_family", sa.String(length=10), nullable=False, server_default="sans"),
    )
    op.add_column(
        "profiles_v2",
        sa.Column("show_photo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("profiles_v2", "show_photo")
    op.drop_column("profiles_v2", "font_family")
    op.drop_column("profiles_v2", "accent_color")
