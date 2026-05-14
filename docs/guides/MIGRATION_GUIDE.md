# Database Migration Guide

## Overview
New features (notes, deadlines) require database schema updates. This guide explains how to run migrations.

## What Changed
- Added `notes` column (TEXT, nullable) to jobs table
- Added `deadline` column (TIMESTAMP, nullable) to jobs table

## Migration Methods

### Method 1: Using SQL Files (Recommended)
The migration SQL files are in `backend/migrations/`:
- `001_add_notes_column.sql`
- `002_add_deadline_column.sql`

#### Using psql (PostgreSQL CLI):
```bash
cd backend
psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/001_add_notes_column.sql
psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/002_add_deadline_column.sql
```

Replace these with your actual values:
- `-h localhost` → Your database host
- `-p 5432` → Your database port
- `-U postgres` → Your database user
- `-d job_assistant_db` → Your database name

#### Using Bash script:
```bash
cd backend
chmod +x run_migrations.sh
./run_migrations.sh
```

Environment variables (optional):
```bash
DB_HOST=localhost DB_PORT=5432 DB_NAME=job_assistant_db DB_USER=postgres ./run_migrations.sh
```

### Method 2: Using Python Migration Script
If you have SQLAlchemy properly configured:

```bash
cd backend
python migrate_notes.py
python migrate_deadline.py
```

### Method 3: Using Database GUI (pgAdmin, DBeaver, etc.)
If you prefer a visual interface:
1. Open your database GUI
2. Connect to your database
3. Run each SQL command from the files:
```sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP NULL;
```

### Method 4: Using FastAPI Lifespan (Automatic)
If you have Alembic configured, the FastAPI lifespan hook will create tables on startup:
```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

However, ALTER TABLE is not automatic, so manual migration is still needed for new columns.

## Verification
After running migrations, verify the columns exist:

```sql
-- Check columns in jobs table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY column_name;
```

You should see:
- `notes | text | YES`
- `deadline | timestamp without time zone | YES`

## Common Issues

### "column does not exist" error
**Problem**: You're getting `UndefinedColumnError: column jobs.notes does not exist`
**Solution**: Run one of the migration methods above

### PostgreSQL connection denied
**Problem**: `FATAL: Ident authentication failed for user "postgres"`
**Solution**: Update `-U` flag to your actual database user

### Database not found
**Problem**: `FATAL: database "job_assistant_db" does not exist`
**Solution**: Update `-d` flag to your actual database name, or create the database first:
```sql
CREATE DATABASE job_assistant_db;
```

### psql command not found
**Problem**: `psql: command not found`
**Solution**:
- Install PostgreSQL client tools
- Or use Database GUI mentioned in Method 3
- Or contact your database administrator

## Rollback (if needed)
If you need to undo the migrations:

```sql
ALTER TABLE jobs DROP COLUMN IF EXISTS notes;
ALTER TABLE jobs DROP COLUMN IF EXISTS deadline;
```

## Next Steps
After successful migration:
1. Restart your FastAPI backend
2. The application should work without database errors
3. New features will be available in the UI

## Support
If migrations fail:
1. Check PostgreSQL is running: `psql -U postgres -c "SELECT 1;"`
2. Verify database credentials
3. Check database logs for specific errors
4. Ensure you have proper permissions to ALTER TABLE
