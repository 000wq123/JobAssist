# Complete Testing Checklist

## ✅ Backend Structure Verification

### Models
- ✅ `app/models/resume_data.py` - Created
  - ResumeData class with all fields
  - JSON fields for flexible data storage
  - Relationships to User model
  - Timestamps (created_at, updated_at)

### Schemas
- ✅ `app/schemas/resume_data.py` - Created
  - ResumeDataCreate schema
  - ResumeDataUpdate schema
  - ResumeDataOut schema
  - Nested schemas (WorkExperience, Education, Skill, Certification)

### Services
- ✅ `app/services/resume_templates.py` - Created
  - 3 HTML/CSS templates (Classic, Modern, Creative)
  - get_template() function
  - Templates include placeholders for dynamic content

- ✅ `app/services/resume_generator.py` - Created
  - render_resume_html() function
  - Translation dictionary (en, es, fr)
  - Date formatting functions
  - Section rendering (summary, experience, education, skills, certifications)

### Routes
- ✅ `app/api/routes/resume_data.py` - Created
  - POST / - Create resume
  - GET / - List resumes
  - GET /{resume_id} - Get specific resume
  - PATCH /{resume_id} - Update resume
  - DELETE /{resume_id} - Delete resume
  - GET /{resume_id}/preview - Get HTML preview

### Main App
- ✅ `app/main.py` - Updated
  - Import resume_data router
  - Include router with /api/resume-data prefix

## 🗄️ Database Migration

### Migration Files Created
- ✅ `migrations/003_create_resume_data_table.sql`
  - Creates resume_data table
  - Sets up JSONB columns for flexible data
  - Creates index on user_id for performance

### Pre-Migration Checklist
- [ ] PostgreSQL is running
- [ ] Database connection works
- [ ] User has proper permissions

### Migration Steps
- [ ] Run: `psql -h localhost -p 5432 -U postgres -d job_assistant_db -f migrations/003_create_resume_data_table.sql`
- [ ] Verify table exists: `SELECT * FROM information_schema.tables WHERE table_name='resume_data';`
- [ ] Check columns: `\d resume_data` (in psql)

## 🚀 Backend Server Testing

### Server Startup
- [ ] Start server: `uvicorn app.main:app --reload`
- [ ] Check for errors in console
- [ ] Verify Swagger docs load: http://localhost:8000/docs
- [ ] All resume-data endpoints visible in docs

### Authentication
- [ ] Login to get JWT token
- [ ] Use token in Authorization header for requests

## 🧪 API Endpoint Testing

### Create Resume
```bash
POST /api/resume-data/
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-1234",
  "location": "San Francisco, CA",
  "professional_summary": "5 years software engineering",
  "template_id": 1,
  "language": "en"
}
```
- [ ] Returns 201 status
- [ ] Returns created resume with id
- [ ] Data matches what was sent

### List Resumes
```bash
GET /api/resume-data/
```
- [ ] Returns 200 status
- [ ] Returns array of resumes
- [ ] Only user's own resumes shown

### Get Resume Details
```bash
GET /api/resume-data/1
```
- [ ] Returns 200 status
- [ ] Returns single resume object
- [ ] All fields present

### Get Resume Preview (HTML)
```bash
GET /api/resume-data/1/preview
```
- [ ] Returns 200 status
- [ ] Returns object with "html" field
- [ ] HTML is valid and contains all resume data
- [ ] Different templates produce different HTML
- [ ] Different languages show translated headers

### Update Resume
```bash
PATCH /api/resume-data/1
{
  "professional_summary": "Updated summary..."
}
```
- [ ] Returns 200 status
- [ ] Only specified fields updated
- [ ] Other fields unchanged

### Add Work Experience
```bash
PATCH /api/resume-data/1
{
  "work_experience": [
    {
      "title": "Software Engineer",
      "company": "Tech Corp",
      "startDate": "2020-01",
      "endDate": "2023-12",
      "description": "Built web applications"
    }
  ]
}
```
- [ ] Returns 200 status
- [ ] Work experience saved correctly
- [ ] Shows in preview

### Add Education
```bash
PATCH /api/resume-data/1
{
  "education": [
    {
      "school": "State University",
      "degree": "Bachelor's",
      "field": "Computer Science",
      "graduationDate": "2020-05"
    }
  ]
}
```
- [ ] Returns 200 status
- [ ] Education saved correctly
- [ ] Shows in preview

### Add Skills
```bash
PATCH /api/resume-data/1
{
  "skills": [
    {
      "category": "Languages",
      "items": ["Python", "JavaScript", "TypeScript"]
    },
    {
      "category": "Frameworks",
      "items": ["React", "FastAPI", "Django"]
    }
  ]
}
```
- [ ] Returns 200 status
- [ ] Skills saved correctly
- [ ] Shows in preview

### Delete Resume
```bash
DELETE /api/resume-data/1
```
- [ ] Returns 204 status (no content)
- [ ] Resume no longer appears in list

## 🎨 Template Testing

### Template 1: Classic
- [ ] Preview shows clean, traditional design
- [ ] Bottom borders on sections
- [ ] Professional colors (#2c3e50)
- [ ] All fields visible

### Template 2: Modern
- [ ] Preview shows contemporary design
- [ ] Minimalist aesthetic
- [ ] Blue accents (#1e3a8a)
- [ ] Good spacing

### Template 3: Creative
- [ ] Preview shows colorful design
- [ ] Gradient header (purple to pink)
- [ ] Left border accents
- [ ] Visual interest maintained

## 🌍 Language Testing

### English (en)
- [ ] Headers in English
- [ ] Date format appropriate
- [ ] All text readable

### Spanish (es)
- [ ] Headers in Spanish
  - Professional Summary → Resumen Profesional
  - Work Experience → Experiencia Laboral
  - Education → Educación
  - Skills → Habilidades
  - Certifications → Certificaciones

### French (fr)
- [ ] Headers in French
  - Professional Summary → Résumé Professionnel
  - Work Experience → Expérience Professionnelle
  - Education → Éducation
  - Skills → Compétences
  - Certifications → Certifications

## 🔐 Security Testing

### Authentication
- [ ] Unauthenticated requests to /resume-data return 401
- [ ] Users can only access their own resumes
- [ ] Delete/edit operations verify ownership

### Data Validation
- [ ] full_name is required
- [ ] email is required
- [ ] Invalid template_id handled gracefully
- [ ] Invalid language defaults to 'en'

## 📊 Data Integrity

### Empty State
- [ ] Resume can be created with just name and email
- [ ] Optional fields can be null
- [ ] Partial updates work correctly

### Complex Data
- [ ] Multiple work experiences save correctly
- [ ] Multiple skills with items save correctly
- [ ] Special characters in text fields preserved
- [ ] Long descriptions (500+ chars) handled

## 🚨 Error Handling

### 404 Errors
- [ ] Get non-existent resume returns 404
- [ ] Update non-existent resume returns 404
- [ ] Delete non-existent resume returns 404

### 403 Errors
- [ ] User can't access another user's resume
- [ ] User can't edit another user's resume
- [ ] User can't delete another user's resume

### Validation Errors
- [ ] Invalid data returns 422
- [ ] Missing required fields returns 422
- [ ] Invalid JSON returns 400

## ✨ Expected Results Summary

All tests should pass with:
- ✅ Proper status codes (201, 200, 204, 404, 401, 422)
- ✅ Correct response schemas
- ✅ Data consistency
- ✅ Security enforcement
- ✅ Multi-language support
- ✅ Multiple template support

## Next Steps After Testing

Once all tests pass:
1. Build React resume builder form
2. Implement PDF generation
3. Create resume management UI
4. Add to job application workflow
