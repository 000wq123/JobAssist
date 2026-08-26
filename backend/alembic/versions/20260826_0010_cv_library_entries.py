"""cv_library_entries

Add the server-side mirror of the CV builder's saved-CV library so
`cv_library_v1` snapshots follow a user across devices (GET/PUT via
`/api/profile/cv-library`).

Revision ID: 20260826_0010
Revises: 20260602_0009
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260826_0010"
down_revision: Union[str, None] = "20260602_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cv_library_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entry_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False, server_default="Lebenslauf"),
        sa.Column("template_id", sa.String(length=50), nullable=True),
        sa.Column("created_at_client", sa.String(length=40), nullable=True),
        sa.Column("profile", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
    )
    op.create_index(
        "ix_cv_library_entries_user_id", "cv_library_entries", ["user_id"]
    )
    op.create_index(
        "ix_cv_library_entries_entry_id", "cv_library_entries", ["entry_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_cv_library_entries_entry_id", table_name="cv_library_entries")
    op.drop_index("ix_cv_library_entries_user_id", table_name="cv_library_entries")
    op.drop_table("cv_library_entries")
