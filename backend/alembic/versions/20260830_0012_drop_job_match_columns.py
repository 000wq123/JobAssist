"""drop job match columns

The fit-match feature was removed in v1 — students don't need to know why a
job matches them. Drops the now-unused match columns from `jobs`.

Revision ID: 20260830_0012
Revises: 20260829_0011
Create Date: 2026-08-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260830_0012"
down_revision: Union[str, None] = "20260829_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("jobs", "match_score")
    op.drop_column("jobs", "match_feedback")


def downgrade() -> None:
    op.add_column("jobs", sa.Column("match_feedback", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("match_score", sa.Float(), nullable=True))
