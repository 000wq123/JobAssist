# Check What Tables Exist

The FastAPI server is running and should have auto-created tables. Let's verify:

## Check Tables in PostgreSQL

```powershell
psql -U postgres -d job_assistant_db -c "\dt"
```

You should see these tables:
- users
- user_profile
- resumes (from old resume upload feature)
- jobs
- resume_data (once migration runs)

## If Tables Don't Exist

The server might be waiting for the database configuration. Check:

1. **Look at server logs** - Is there an error about database connection?
2. **Verify .env file** - Make sure it has correct database credentials:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost/job_assistant_db
   ```

3. **If tables still don't exist**, manually create the initial schema:
   ```powershell
   python migrate.py
   ```

## Correct Order to Run Migrations

If you need to run them manually:

```powershell
# 1. Create initial schema (if not auto-created)
python migrate.py

# 2. Add resume_data table
psql -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql

# 3. Add notes column to jobs
python migrate_notes.py

# 4. Add deadline column to jobs
python migrate_deadline.py
```

## Then Test

Once tables exist, the resume endpoints should work at:
```
http://127.0.0.1:8000/docs
```
