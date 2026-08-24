"""backfill_kv_source_urls

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-02 20:25:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260602_0009"
down_revision: Union[str, None] = "20260602_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Backfill source_url for existing kv_wages rows."""
    op.execute(
        """
        UPDATE kv_wages
        SET source_url = CASE category
            WHEN 'teilzeit' THEN 'https://www.wko.at/kollektivvertrag/kollektivvertrag-handel-angestellte-2025'
            WHEN 'vollzeit' THEN 'https://www.wko.at/kollektivvertrag/kollektivvertrag-handel-angestellte-2025'
            WHEN 'samstagsjob' THEN 'https://www.wko.at/kollektivvertrag/kollektivvertrag-handel-angestellte-2025'
            WHEN 'geringfügig' THEN 'https://www.wko.at/kollektivvertrag/kollektivvertrag-handel-angestellte-2025'
            WHEN 'lehre' THEN 'https://www.wko.at/oe/kollektivvertrag/gehaltstabelle-angestellte-handel-2025.pdf'
            WHEN 'praktikum' THEN 'https://www.wko.at/oe/handel/pflichtpraktikum-im-handel'
            WHEN 'ferialjob' THEN 'https://www.wko.at/kollektivvertrag/kollektivvertrag-handel-angestellte-2025'
        END
        WHERE source_url IS NULL OR source_url = '';
        """
    )


def downgrade() -> None:
    """No downgrade for data backfill."""
    pass
