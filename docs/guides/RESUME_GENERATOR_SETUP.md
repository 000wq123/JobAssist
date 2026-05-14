# Resume Generator Setup & Testing Guide

## What's New
A complete resume builder system with:
- ✅ Database model for resume data (ResumeData table)
- ✅ 3 professional HTML/CSS templates (Classic, Modern, Creative)
- ✅ Multi-language support (English, Spanish, French)
- ✅ Full CRUD API endpoints
- ✅ HTML preview generation
- ✅ Translation service for all resume fields

## Database Migration

### Step 1: Run the Migration

Using psql:
```bash
cd backend
psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

Or using the Bash script:
```bash
cd backend
chmod +x run_migrations.sh
DB_HOST=localhost DB_PORT=5432 DB_NAME=job_assistant_db DB_USER=postgres ./run_migrations.sh
```

Then also run:
```bash
psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

### Step 2: Verify the Migration

Check that the table was created:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'resume_data';
```

You should see `resume_data` in the results.

Check the columns:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resume_data'
ORDER BY ordinal_position;
```

## Backend Verification

### Step 3: Check Python Syntax

```bash
cd backend
python -m py_compile app/models/resume_data.py
python -m py_compile app/schemas/resume_data.py
python -m py_compile app/services/resume_templates.py
python -m py_compile app/services/resume_generator.py
python -m py_compile app/api/routes/resume_data.py
```

All should complete without errors.

### Step 4: Start the FastAPI Server

```bash
cd backend
# If using virtual environment, activate it first
# On Windows: .venv\Scripts\activate
# On Linux/Mac: source .venv/bin/activate

# Then start the server
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## API Testing

### Step 5: Test the Endpoints

Once the server is running, you can test using curl or Postman.

#### 1. Create a Resume
```bash
curl -X POST http://localhost:8000/api/resume-data/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "location": "San Francisco, CA",
    "professional_summary": "Experienced software engineer with 5 years in full-stack development",
    "template_id": 1,
    "language": "en"
  }'
```

#### 2. List Resumes
```bash
curl -X GET http://localhost:8000/api/resume-data/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Get Resume HTML Preview
```bash
curl -X GET http://localhost:8000/api/resume-data/1/preview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

This returns HTML that can be converted to PDF.

#### 4. Update Resume
```bash
curl -X PATCH http://localhost:8000/api/resume-data/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "professional_summary": "Updated summary..."
  }'
```

#### 5. Delete Resume
```bash
curl -X DELETE http://localhost:8000/api/resume-data/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Using FastAPI Docs

The easiest way to test:

1. Open http://localhost:8000/docs in your browser
2. You'll see the Swagger UI with all endpoints
3. Click "Authorize" and paste your JWT token
4. Try out each endpoint interactively

## Troubleshooting

### "column resume_data does not exist"
**Solution**: Run the migration file (Step 1)

### "ModuleNotFoundError: No module named 'app.models.resume_data'"
**Solution**: Make sure the file was created in `backend/app/models/resume_data.py`

### "ImportError in app.main"
**Solution**: Check that `resume_data` is imported correctly in main.py

### API returns 404 for resume-data endpoints
**Solution**: Restart the FastAPI server after migrations

### Database connection error
**Solution**:
1. Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1;"`
2. Check credentials in your `.env` file
3. Ensure database exists: `psql -U postgres -l | grep job_assistant_db`

## Next Steps After Testing

Once verified:
1. Build the React resume builder form
2. Implement PDF generation
3. Create resume management UI
4. Add resume preview functionality
5. Integrate with job applications

## Database Schema Reference

The `resume_data` table structure:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Primary key |
| user_id | INTEGER | NO | Foreign key to users |
| full_name | VARCHAR(255) | NO | User's full name |
| email | VARCHAR(255) | NO | Contact email |
| phone | VARCHAR(20) | YES | Phone number |
| location | VARCHAR(255) | YES | City/location |
| professional_summary | TEXT | YES | Professional overview |
| work_experience | JSONB | YES | Array of jobs |
| education | JSONB | YES | Array of education |
| skills | JSONB | YES | Array of skill categories |
| certifications | JSONB | YES | Array of certifications |
| template_id | INTEGER | NO | Template (1-3) |
| language | VARCHAR(10) | NO | Language code (en/es/fr) |
| created_at | TIMESTAMP | NO | Creation timestamp |
| updated_at | TIMESTAMP | NO | Last update timestamp |
