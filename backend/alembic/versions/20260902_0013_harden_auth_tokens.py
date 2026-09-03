"""harden authentication token lifecycle

Revision ID: 20260902_0013
Revises: 20260830_0012
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260902_0013"
down_revision: Union[str, None] = "20260830_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("auth_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("password_reset_nonce", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_reset_nonce")
    op.drop_column("users", "auth_version")
