"""Alembic environment.

- Reads DATABASE_URL via `app.core.config.settings`.
- Async-aware (works with `postgresql+asyncpg://` and `sqlite+aiosqlite://`).
- Imports all models so `target_metadata` reflects the full schema.
"""
from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import settings + models so Base.metadata is populated.
from app.core.config import settings
from app.core.database import Base
from app.models import (  # noqa: F401 — registers models with Base.metadata
    job,
    job_alert,
    processed_webhook_event,
    refresh_token,
    resume,
    subscription,
    usage,
    user,
    user_profile,
    profile_v2,
    web_push_subscription,
    inbox_item,
    kv_wage,
    deadline,
)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from settings (alembic.ini intentionally has no URL).
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL without a live DB connection."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Async branch — uses async_engine_from_config + run_sync(do_run_migrations)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
