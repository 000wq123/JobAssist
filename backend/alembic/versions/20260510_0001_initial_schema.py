"""initial schema

Captures the full database schema as of 2026-05-10. This file is the
new source of truth for fresh deployments.

Existing production databases were already migrated through the legacy
SQL files in `backend/migrations/` and the `app.core.startup_migrations`
helper. Run `alembic stamp head` once on those databases so Alembic
knows the schema is already in place — see backend/alembic/README.md.

Revision ID: 20260510_0001
Revises:
Create Date: 2026-05-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260510_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("fingerprint", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("daily_manual_run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("daily_creation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("daily_counts_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("location", sa.String(), nullable=False, server_default="United States"),
        sa.Column("language", sa.String(), nullable=False, server_default="en"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_fingerprint", "users", ["fingerprint"])

    # ── user_profiles ────────────────────────────────────────────────────────
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("desired_locations", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("salary_min", sa.Float(), nullable=True),
        sa.Column("salary_max", sa.Float(), nullable=True),
        sa.Column("job_types", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("industries", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("experience_level", sa.String(), nullable=True),
        sa.Column("is_open_to_relocation", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("avatar", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── resumes ──────────────────────────────────────────────────────────────
    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("parsed_json", sa.Text(), nullable=True),
        sa.Column("skill_analysis_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])

    # ── jobs ─────────────────────────────────────────────────────────────────
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resume_id", sa.Integer(), sa.ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True, server_default="other"),
        sa.Column("status", sa.String(), nullable=False, server_default="bookmarked"),
        sa.Column("match_score", sa.Float(), nullable=True),
        sa.Column("match_feedback", sa.Text(), nullable=True),
        sa.Column("cover_letter", sa.Text(), nullable=True),
        sa.Column("interview_qa", sa.Text(), nullable=True),
        sa.Column("research_data", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_job_user_status", "jobs", ["user_id", "status"])
    op.create_index("idx_job_user_created", "jobs", ["user_id", "created_at"])

    # ── job_alerts ───────────────────────────────────────────────────────────
    op.create_table(
        "job_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("keywords", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("job_type", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("frequency", sa.String(), nullable=False, server_default="daily"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_job_alerts_user_id", "job_alerts", ["user_id"])
    op.create_index("idx_alert_active", "job_alerts", ["is_active"])

    # ── refresh_tokens ───────────────────────────────────────────────────────
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    # ── subscriptions ────────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("plan", sa.String(20), nullable=False, server_default="basic"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── usage_tracking ───────────────────────────────────────────────────────
    op.create_table(
        "usage_tracking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feature", sa.String(50), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "feature", "period_start", name="uq_user_feature_period"),
    )
    op.create_index("ix_usage_tracking_user_id", "usage_tracking", ["user_id"])
    op.create_index("idx_usage_period_feature", "usage_tracking", ["period_start", "feature"])

    # ── processed_webhook_events ─────────────────────────────────────────────
    op.create_table(
        "processed_webhook_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("processed_webhook_events")
    op.drop_index("idx_usage_period_feature", table_name="usage_tracking")
    op.drop_index("ix_usage_tracking_user_id", table_name="usage_tracking")
    op.drop_table("usage_tracking")
    op.drop_table("subscriptions")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_index("idx_alert_active", table_name="job_alerts")
    op.drop_index("ix_job_alerts_user_id", table_name="job_alerts")
    op.drop_table("job_alerts")
    op.drop_index("idx_job_user_created", table_name="jobs")
    op.drop_index("idx_job_user_status", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_resumes_user_id", table_name="resumes")
    op.drop_table("resumes")
    op.drop_table("user_profiles")
    op.drop_index("ix_users_fingerprint", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
