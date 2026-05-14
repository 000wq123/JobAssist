# Quick Start - Resume Generator Testing

## ✅ Issue Fixed
The User model was missing the relationship to ResumeData. This has been fixed.

## 🚀 Quick Test (5 minutes)

### 1. Run the Migration
```bash
cd backend
psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

Or if using Windows PowerShell:
```powershell
cd backend
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql
```

Expected output:
```
CREATE TABLE
CREATE INDEX
```

### 2. Start the Backend Server
```bash
cd backend
# Activate venv if needed (Windows: .venv\Scripts\activate, Linux/Mac: source .venv/bin/activate)
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Test in Browser
1. Open: **http://localhost:8000/docs**
2. Click the green "Authorize" button
3. Paste your JWT token from login
4. Click "Authorize" and close the dialog

### 4. Test the Resume Endpoints

#### Test 1: Create a Resume
1. Find "POST /api/resume-data/" endpoint
2. Click "Try it out"
3. Replace the example body with:
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-1234",
  "location": "San Francisco, CA",
  "professional_summary": "Experienced software engineer",
  "template_id": 1,
  "language": "en"
}
```
4. Click "Execute"
5. Should return **201** status with the created resume

#### Test 2: Get HTML Preview
1. Find "GET /api/resume-data/{resume_id}/preview" endpoint
2. Click "Try it out"
3. Enter `1` for resume_id
4. Click "Execute"
5. Should return **200** with HTML content

#### Test 3: Update Resume
1. Find "PATCH /api/resume-data/{resume_id}" endpoint
2. Click "Try it out"
3. Enter `1` for resume_id
4. Replace body with:
```json
{
  "professional_summary": "Senior software engineer with 8+ years experience"
}
```
5. Click "Execute"
6. Should return **200** with updated resume

#### Test 4: List Resumes
1. Find "GET /api/resume-data/" endpoint
2. Click "Try it out"
3. Click "Execute"
4. Should return **200** with array of your resumes

#### Test 5: Delete Resume
1. Find "DELETE /api/resume-data/{resume_id}" endpoint
2. Click "Try it out"
3. Enter `1` for resume_id
4. Click "Execute"
5. Should return **204** (no content)

## ✨ Expected Results

All endpoints should work with:
- ✅ **201** for POST (create)
- ✅ **200** for GET and PATCH (read/update)
- ✅ **204** for DELETE (delete)
- ✅ Response bodies match the schema

## 🎨 Test Different Templates

Try creating resumes with different templates:
```json
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "template_id": 2,
  "language": "en"
}
```

Change `template_id` to test:
- `1` = Classic Professional
- `2` = Modern Minimalist
- `3` = Creative (colorful)

Then view preview to see different designs.

## 🌍 Test Different Languages

Try creating with different languages:
```json
{
  "full_name": "José García",
  "email": "jose@example.com",
  "template_id": 1,
  "language": "es"
}
```

Change `language` to:
- `"en"` = English
- `"es"` = Spanish (Español)
- `"fr"` = French (Français)

View preview to see translated headers.

## 🔍 Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1;"`
- Verify database exists: `psql -U postgres -l | grep job_assistant_db`
- Check credentials in `.env`

### "Table does not exist"
- Run the migration from Step 1
- Verify with: `psql -U postgres -d job_assistant_db -c "\d resume_data"`

### "401 Unauthorized"
- Make sure you clicked "Authorize" in Swagger UI
- Use a valid JWT token from your login
- Token must not be expired

### "422 Unprocessable Entity"
- Check required fields are present (full_name, email)
- Verify template_id is 1, 2, or 3
- Verify language is "en", "es", or "fr"

### Server won't start
- Check for syntax errors: `python -m py_compile app/models/resume_data.py`
- Verify all new files are created
- Check imports in app/main.py

## ✅ Checklist

- [ ] Migration ran successfully
- [ ] Server starts without errors
- [ ] Can authorize in Swagger UI
- [ ] Can create a resume (201)
- [ ] Can list resumes (200)
- [ ] Can view preview (200)
- [ ] Can update resume (200)
- [ ] Can delete resume (204)
- [ ] Different templates work
- [ ] Different languages work

## 🎯 Next Steps After Testing

Once all tests pass:
1. Build React resume builder form
2. Add PDF export functionality
3. Create resume management UI
4. Connect to job applications

## 📞 Support

If you encounter any issues:
1. Check the error message carefully
2. Verify all files are created
3. Check logs in terminal
4. Refer to TESTING_CHECKLIST.md for comprehensive tests
