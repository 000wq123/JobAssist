# Windows Setup for Resume Generator

## Step 1: Create the Database

### Option A: Using pgAdmin (GUI - Easiest)
1. Open **pgAdmin** (search for it in Start menu)
2. Connect to your PostgreSQL server
3. Right-click on "Databases"
4. Click "Create" → "Database"
5. Name: `job_assistant_db`
6. Click "Save"

### Option B: Using Command Prompt / PowerShell

**Command Prompt:**
```cmd
psql -U postgres -c "CREATE DATABASE job_assistant_db;"
```

**PowerShell:**
```powershell
psql -U postgres -c "CREATE DATABASE job_assistant_db;"
```

If `psql` command is not found, you need to add PostgreSQL to your PATH:

**Find PostgreSQL Installation:**
```powershell
# Usually at one of these locations:
C:\Program Files\PostgreSQL\15\bin\psql.exe
C:\Program Files\PostgreSQL\16\bin\psql.exe
```

**Use Full Path:**
```powershell
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' -U postgres -c "CREATE DATABASE job_assistant_db;"
```

### Verify Database Created
```cmd
psql -U postgres -l
```

You should see `job_assistant_db` in the list.

---

## Step 2: Run the Migration

Once database is created:

```cmd
cd C:\path\to\SaaS_Project\backend
psql -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

Or with full path:
```cmd
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

---

## Step 3: Verify Migration

```cmd
psql -U postgres -d job_assistant_db -c "\dt"
```

You should see `resume_data` table in the list.

---

## Step 4: Backend is Already Running! ✅

Your FastAPI server is running at:
```
http://127.0.0.1:8000
```

Once migration is done, open that URL in your browser.

---

## Step 5: Test in Swagger UI

1. Open: http://127.0.0.1:8000/docs
2. Click "Authorize" button (top right)
3. Paste your JWT token
4. Test the `/api/resume-data/` endpoints

---

## Troubleshooting

### "psql: command not found"
Add PostgreSQL to Windows PATH:
1. Find your PostgreSQL installation folder
2. Copy the path to `bin` folder
3. Add to Windows PATH via System Settings

**Or use full path each time:**
```powershell
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' -U postgres -c "..."
```

### "FATAL: database 'job_assistant_db' does not exist"
- Run Step 1 to create the database
- Verify with: `psql -U postgres -l`

### "FATAL: Ident authentication failed"
- Use correct username: `-U postgres`
- Make sure PostgreSQL is running (search for pgAdmin)

---

## Quick Reference

**Create Database:**
```powershell
psql -U postgres -c "CREATE DATABASE job_assistant_db;"
```

**Run Migration:**
```powershell
psql -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

**Verify:**
```powershell
psql -U postgres -d job_assistant_db -c "\dt"
```

**Start Backend (from backend folder):**
```powershell
uvicorn app.main:app --reload
```

**Test:**
```
http://127.0.0.1:8000/docs
```
