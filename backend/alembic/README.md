# Alembic migrations

This directory is the **single source of truth** for database schema
changes going forward. The legacy SQL files in `backend/migrations/` and
`backend/app/core/startup_migrations.py` are kept only as a historical
reference — they are no longer applied automatically.

## Bootstrapping an existing production database

The current schema is captured in
`versions/20260510_0001_initial_schema.py`. **Do not run** that migration
against a database that was already migrated through the legacy SQL
files; it would fail because the tables already exist.

Instead, mark the existing database as up-to-date once:

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://... alembic stamp head
```

Then deploy the new code. Future schema changes use the standard flow.

## Day-to-day workflow

```bash
# 1. Edit a SQLAlchemy model in app/models/

# 2. Generate a migration from the diff
DATABASE_URL=postgresql+asyncpg://... alembic revision --autogenerate -m "add foo column"

# 3. Review the generated file in versions/ — autogenerate is not perfect

# 4. Apply locally
DATABASE_URL=postgresql+asyncpg://... alembic upgrade head

# 5. Commit + open PR. CI runs the migration against a clean Postgres.
```

## Production deploys

`render.yaml` runs `alembic upgrade head` as a **pre-deploy command** on
every web release, so migrations are applied once before any worker
starts. This avoids the "every gunicorn worker tries to migrate" race.

## Fresh local dev DB

```bash
cd backend
createdb jobassist_dev
DATABASE_URL=postgresql+asyncpg://localhost/jobassist_dev alembic upgrade head
```

Or for SQLite:

```bash
DATABASE_URL=sqlite+aiosqlite:///./dev.db alembic upgrade head
```

## Rolling back

```bash
alembic downgrade -1   # one revision back
alembic downgrade base # all the way down (DESTRUCTIVE)
```
