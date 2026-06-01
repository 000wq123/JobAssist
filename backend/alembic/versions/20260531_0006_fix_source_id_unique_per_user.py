"""fix_source_id_unique_per_user

Change the unique constraint on jobs.source_id from global to per-user
so that different users can save the same Adzuna job.

Revision ID: 20260531_0006
Revises: 20260530_0005
Create Date: 2026-05-31 10:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260531_0006'
down_revision: Union[str, None] = '20260530_0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old global unique index on source_id
    op.drop_index('idx_jobs_source_id', table_name='jobs')
    # Create a new per-user unique index on (user_id, source_id)
    op.create_index(
        'idx_jobs_user_source_id',
        'jobs',
        ['user_id', 'source_id'],
        unique=True,
        postgresql_where=sa.text("source_id IS NOT NULL")
    )


def downgrade() -> None:
    op.drop_index('idx_jobs_user_source_id', table_name='jobs')
    op.create_index(
        'idx_jobs_source_id',
        'jobs',
        ['source_id'],
        unique=True,
        postgresql_where=sa.text("source_id IS NOT NULL")
    )
