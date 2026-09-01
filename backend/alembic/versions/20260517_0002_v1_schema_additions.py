"""v1 schema additions

New columns and tables required for v1 product:
- users     : plan, notification_channel, phone_e164
- jobs      : source, source_id, full_url, location, job_type,
              salary_text, posted_at, expires_at  (scraper + display)
- NEW profiles_v2          : Austrian CV-builder data (replaces user_profiles long-term)
- NEW web_push_subscriptions : VAPID push device registrations
- NEW inbox_items           : dismissible dashboard cards / notifications
- NEW kv_wages              : Kollektivvertrag wage lookup (Lohnrechner)
- NEW deadlines             : application-cycle calendar entries

Revision ID: 20260517_0002
Revises: 20260510_0001
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260517_0002"
down_revision: Union[str, None] = "20260510_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_array_default = sa.text("'[]'")
    # ── users: v1 additions ──────────────────────────────────────────────────
    op.add_column("users", sa.Column("plan", sa.String(20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("notification_channel", sa.String(20), nullable=False, server_default="email"))
    op.add_column("users", sa.Column("phone_e164", sa.String(20), nullable=True))

    # ── jobs: scraper fields + display fields needed by frontend ─────────────
    op.add_column("jobs", sa.Column("source", sa.String(50), nullable=True))
    op.add_column("jobs", sa.Column("source_id", sa.String(255), nullable=True))
    op.add_column("jobs", sa.Column("full_url", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("location", sa.String(255), nullable=True))
    op.add_column("jobs", sa.Column("job_type", sa.String(50), nullable=True))
    op.add_column("jobs", sa.Column("salary_text", sa.String(255), nullable=True))
    op.add_column("jobs", sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("jobs", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    # Partial unique index — dedup scraped listings globally by source_id.
    op.create_index(
        "idx_jobs_source_id",
        "jobs",
        ["source_id"],
        unique=True,
        postgresql_where=sa.text("source_id IS NOT NULL"),
    )

    # ── profiles_v2: AT-specific CV builder ─────────────────────────────────
    op.create_table(
        "profiles_v2",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        # Persönliches
        sa.Column("vorname", sa.String(100), nullable=True),
        sa.Column("nachname", sa.String(100), nullable=True),
        sa.Column("geburtsdatum", sa.Date(), nullable=True),
        sa.Column("strasse", sa.String(255), nullable=True),
        sa.Column("plz", sa.String(10), nullable=True),
        sa.Column("ort", sa.String(100), nullable=True),
        sa.Column("telefon", sa.String(30), nullable=True),
        sa.Column("email_kontakt", sa.String(255), nullable=True),
        sa.Column("staatsbuergerschaft", sa.String(100), nullable=False, server_default="AT"),
        sa.Column("arbeitserlaubnis", sa.Boolean(), nullable=True),
        # Schule
        sa.Column("schulname", sa.String(255), nullable=True),
        sa.Column("schultyp", sa.String(50), nullable=True),
        sa.Column("klasse", sa.String(20), nullable=True),
        sa.Column("abschlussjahr", sa.SmallInteger(), nullable=True),
        # Arrays stored as JSON
        sa.Column("erfahrungen", sa.JSON(), nullable=False, server_default=json_array_default),
        sa.Column("sprachkenntnisse", sa.JSON(), nullable=False, server_default=json_array_default),
        sa.Column("faehigkeiten", sa.JSON(), nullable=False, server_default=json_array_default),
        sa.Column("hobbies", sa.Text(), nullable=True),
        sa.Column("foto_url", sa.Text(), nullable=True),
        # Meta
        sa.Column("completion_pct", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── web_push_subscriptions ───────────────────────────────────────────────
    op.create_table(
        "web_push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("ua_hint", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("endpoint", name="uq_push_endpoint"),
    )
    op.create_index("ix_push_user_id", "web_push_subscriptions", ["user_id"])

    # ── inbox_items ──────────────────────────────────────────────────────────
    op.create_table(
        "inbox_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("ref_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("action_url", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_inbox_user_id", "inbox_items", ["user_id"])
    op.create_index("idx_inbox_user_status", "inbox_items", ["user_id", "is_read", "snoozed_until"])

    # ── kv_wages ─────────────────────────────────────────────────────────────
    op.create_table(
        "kv_wages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("region", sa.String(50), nullable=False, server_default="AT"),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("kollektivvertrag", sa.String(255), nullable=True),
        sa.Column("hourly_min_cent", sa.Integer(), nullable=False),
        sa.Column("hourly_max_cent", sa.Integer(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("category", "region", "year", name="uq_kv_category_region_year"),
    )

    # ── deadlines ────────────────────────────────────────────────────────────
    op.create_table(
        "deadlines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("closes_on", sa.Date(), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="user"),
        sa.Column("reminder_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_deadlines_closes_on", "deadlines", ["closes_on"])
    op.create_index("idx_deadlines_user_closes", "deadlines", ["user_id", "closes_on"])


def downgrade() -> None:
    op.drop_index("idx_deadlines_user_closes", table_name="deadlines")
    op.drop_index("idx_deadlines_closes_on", table_name="deadlines")
    op.drop_table("deadlines")
    op.drop_table("kv_wages")
    op.drop_index("idx_inbox_user_status", table_name="inbox_items")
    op.drop_index("ix_inbox_user_id", table_name="inbox_items")
    op.drop_table("inbox_items")
    op.drop_index("ix_push_user_id", table_name="web_push_subscriptions")
    op.drop_table("web_push_subscriptions")
    op.drop_table("profiles_v2")
    op.drop_index("idx_jobs_source_id", table_name="jobs")
    op.drop_column("jobs", "expires_at")
    op.drop_column("jobs", "posted_at")
    op.drop_column("jobs", "salary_text")
    op.drop_column("jobs", "job_type")
    op.drop_column("jobs", "location")
    op.drop_column("jobs", "full_url")
    op.drop_column("jobs", "source_id")
    op.drop_column("jobs", "source")
    op.drop_column("users", "phone_e164")
    op.drop_column("users", "notification_channel")
    op.drop_column("users", "plan")
