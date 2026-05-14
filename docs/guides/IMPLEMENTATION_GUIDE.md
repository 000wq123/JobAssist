# JobAssist - New Features Implementation Guide

## Overview
This guide covers the three major new features added to JobAssist:
1. **Resume Creator** - Build professional resumes with multiple templates
2. **Currency & Location Selection** - Choose your preferred currency and location
3. **Multi-language Support** - Full app localization in English, Spanish, and French

---

## Part 1: Resume Creator

### Backend Components

#### 1. Database Migration
**File**: `backend/migrations/004_add_user_preferences.sql`

Adds three new columns to the `users` table:
- `currency` (VARCHAR(10), DEFAULT 'USD')
- `location` (VARCHAR(255), DEFAULT 'United States')
- `language` (VARCHAR(10), DEFAULT 'en')

#### 2. Updated User Model
**File**: `backend/app/models/user.py`

```python
# User preferences
currency: Mapped[str] = mapped_column(String, default="USD", nullable=False)
location: Mapped[str] = mapped_column(String, default="United States", nullable=False)
language: Mapped[str] = mapped_column(String, default="en", nullable=False)
```

#### 3. Schemas
**File**: `backend/app/schemas/user.py`

Two new schemas:
- `UserOut` - Updated to include currency, location, language
- `UserPreferencesUpdate` - For updating preferences

#### 4. API Endpoints
**File**: `backend/app/api/routes/settings.py`

Two new endpoints:
- `GET /api/settings/preferences` - Retrieve user preferences
- `PUT /api/settings/preferences` - Update user preferences

**Request body example**:
```json
{
  "currency": "EUR",
  "location": "France",
  "language": "fr"
}
```

**Response example**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "currency": "EUR",
  "location": "France",
  "language": "fr",
  "created_at": "2026-03-14T10:00:00"
}
```

### Frontend Components

#### 1. Resume Creator Page
**File**: `frontend/src/pages/ResumeCreatorPage.jsx`

Features:
- Template selection (Classic, Modern, Creative)
- Language selection (English, Spanish, French)
- Form for entering resume data:
  - Personal Information (name, email, phone, location)
  - Professional Summary
  - Skills (comma-separated)
  - Work Experience (JSON)
  - Education (JSON)
  - Certifications (JSON)
- Preview of created resumes
- Delete functionality

#### 2. Updated Settings Page
**File**: `frontend/src/pages/SettingsPage.jsx`

New "App Preferences" section with:
- Currency dropdown selector
- Language dropdown selector
- Location text input
- Separate "Job Search Preferences" section for existing settings

#### 3. Updated Navigation
**File**: `frontend/src/components/layout/Layout.jsx`

New navigation item:
- "Create Resume" (icon: PlusSquare)
- Navigation path: `/resume-creator`

---

## Part 2: Multi-Language Support (i18n)

### Frontend i18n System

#### 1. Translations File
**File**: `frontend/src/i18n/translations.json`

Complete translation dictionary for:
- Common UI elements (save, cancel, delete, etc.)
- Navigation labels
- Resume-related text
- Resume Creator text
- Settings text

Supported languages:
- English (en)
- Spanish (es)
- Français (fr)

#### 2. I18n Context Provider
**File**: `frontend/src/context/I18nContext.jsx`

Provides:
- Global language state
- Translation function `t(key)` for dot-notation keys
- Auto-loading user's language preference from auth store

Usage:
```jsx
const { t, language, setLanguage } = useI18n();
<h1>{t('resume.title')}</h1>
```

#### 3. Main App Setup
**File**: `frontend/src/main.jsx`

Updated to wrap app with `<I18nProvider>`:
```jsx
<I18nProvider>
  <App />
</I18nProvider>
```

---

## Testing Checklist

### Part 1: Resume Creator Testing

#### Backend Testing
1. **Run migrations**:
   ```bash
   cd backend
   python run_sql.py migrations/004_add_user_preferences.sql
   ```

2. **Verify database columns**:
   ```sql
   SELECT currency, location, language FROM users LIMIT 1;
   ```

3. **Test API endpoints**:
   ```bash
   # Get preferences
   curl -X GET http://localhost:8000/api/settings/preferences \
     -H "Authorization: Bearer YOUR_TOKEN"

   # Update preferences
   curl -X PUT http://localhost:8000/api/settings/preferences \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currency": "EUR", "location": "Berlin", "language": "de"}'
   ```

4. **Test Resume Data endpoints**:
   ```bash
   # Create resume
   curl -X POST http://localhost:8000/api/resume-data \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "John Doe",
       "email": "john@example.com",
       "phone": "+1-555-0123",
       "location": "New York",
       "professional_summary": "...",
       "template_id": 1,
       "language": "en",
       "work_experience": [],
       "education": [],
       "skills": [],
       "certifications": []
     }'
   ```

#### Frontend Testing
1. **Navigate to Resume Creator**:
   - Click "Create Resume" in sidebar
   - Verify page loads correctly

2. **Test template selection**:
   - Click each template (Classic, Modern, Creative)
   - Verify template is selected (visual feedback)

3. **Test language selection**:
   - Select English, Spanish, French
   - Verify language dropdown updates

4. **Test form submission**:
   - Fill in required fields (Full Name, Email)
   - Click "Create Resume"
   - Verify success toast notification
   - Check resume appears in right panel

5. **Test resume preview**:
   - Click "Preview" button
   - Verify HTML preview displays in iframe

6. **Test resume deletion**:
   - Click trash icon on resume
   - Verify resume is deleted
   - Verify toast notification

### Part 2: Currency/Location/Language Preferences Testing

#### Backend Testing
1. **Verify preferences endpoint**:
   ```bash
   # Create new user and check defaults
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@test.com", "password": "password"}'

   # Login and get preferences
   curl -X GET http://localhost:8000/api/settings/preferences \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Should return: currency: USD, location: United States, language: en
   ```

2. **Update and verify**:
   ```bash
   curl -X PUT http://localhost:8000/api/settings/preferences \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currency": "GBP", "location": "London"}'

   # Verify update
   curl -X GET http://localhost:8000/api/settings/preferences \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

#### Frontend Testing
1. **Navigate to Settings page**:
   - Click "Preferences" in sidebar
   - Verify "App Preferences" section appears at top

2. **Test currency selector**:
   - Click currency dropdown
   - Select different currency (EUR, GBP, etc.)
   - Save preferences
   - Verify success toast
   - Refresh page and verify currency is saved

3. **Test location input**:
   - Edit location field
   - Enter new location (e.g., "Barcelona")
   - Save preferences
   - Verify persistence

4. **Test language selector**:
   - Select Spanish (es)
   - Click "Save preferences"
   - Verify UI updates to Spanish
   - (Note: Full i18n implementation would update all text)

### Part 3: Multi-Language Support Testing

#### Frontend Testing
1. **Verify i18n context is loaded**:
   - Open browser console
   - Navigation items should be in English by default

2. **Test language switching**:
   - Go to Settings page
   - Change language from English dropdown
   - Save preferences
   - Refresh page
   - Verify language persists

3. **Test translation keys**:
   - In browser console, check that `useI18n()` works:
   ```javascript
   // In any component with useI18n hook:
   const { t } = useI18n();
   t('resume.title') // Should return "My Resume" or translated version
   ```

4. **Verify all pages support translations**:
   - Create resume with Spanish selected
   - Settings page should show Spanish text
   - Navigation labels should be translated

---

## API Reference

### Settings Endpoints

#### GET /api/settings/preferences
Get user's preferences.

**Headers**:
- Authorization: Bearer {token}

**Response** (200 OK):
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "User Name",
  "currency": "USD",
  "location": "United States",
  "language": "en",
  "is_active": true,
  "created_at": "2026-03-14T10:00:00"
}
```

#### PUT /api/settings/preferences
Update user's preferences.

**Headers**:
- Authorization: Bearer {token}
- Content-Type: application/json

**Request Body**:
```json
{
  "currency": "EUR",
  "location": "Paris",
  "language": "fr"
}
```

**Response** (200 OK): Same as GET response

### Resume Data Endpoints

#### POST /api/resume-data
Create a new resume.

**Headers**:
- Authorization: Bearer {token}
- Content-Type: application/json

**Request Body**:
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "location": "New York, NY",
  "professional_summary": "...",
  "work_experience": [],
  "education": [],
  "skills": ["JavaScript", "React", "Node.js"],
  "certifications": [],
  "template_id": 1,
  "language": "en"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "user_id": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  "template_id": 1,
  "language": "en",
  "created_at": "2026-03-14T10:00:00"
}
```

#### GET /api/resume-data
List user's resumes.

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "template_id": 1,
    "language": "en"
  }
]
```

#### GET /api/resume-data/{id}
Get single resume.

#### PATCH /api/resume-data/{id}
Update resume (partial update).

#### DELETE /api/resume-data/{id}
Delete resume.

#### GET /api/resume-data/{id}/preview
Get HTML preview of resume.

**Response**: HTML content

---

## Configuration Notes

### Default Values
- **Currency**: USD
- **Location**: United States
- **Language**: en (English)
- **Resume Templates**: 1 (Classic), 2 (Modern), 3 (Creative)

### Supported Currencies
USD, EUR, GBP, CAD, AUD, JPY, INR, MXN

### Supported Languages
- en: English
- es: Español
- fr: Français

---

## File Structure Summary

### Backend
```
backend/
├── app/
│   ├── models/
│   │   └── user.py (updated)
│   ├── schemas/
│   │   └── user.py (updated)
│   ├── api/routes/
│   │   └── settings.py (updated)
│   └── services/
│       ├── resume_generator.py (existing)
│       └── resume_templates.py (existing)
└── migrations/
    └── 004_add_user_preferences.sql (new)
```

### Frontend
```
frontend/src/
├── pages/
│   ├── ResumeCreatorPage.jsx (new)
│   ├── ResumePage.jsx (existing)
│   ├── SettingsPage.jsx (updated)
│   └── ...
├── context/
│   └── I18nContext.jsx (new)
├── i18n/
│   └── translations.json (new)
├── components/
│   └── layout/
│       └── Layout.jsx (updated)
├── App.jsx (updated)
└── main.jsx (updated)
```

---

## Troubleshooting

### Issue: Resume data not showing in preview
- **Solution**: Ensure resume-data endpoints are included in router setup in `app/main.py`

### Issue: Preferences not saving
- **Solution**: Run migration 004_add_user_preferences.sql
- **Verify**: Check database has the three new columns

### Issue: Language not changing UI
- **Solution**: Ensure I18nProvider wraps entire app in main.jsx
- **Verify**: Check translations.json has all required keys

### Issue: API endpoints returning 404
- **Solution**: Ensure routes are registered in `app/main.py`:
  ```python
  app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
  app.include_router(resume_data.router, prefix="/api/resume-data", tags=["Resume Builder"])
  ```

---

## Next Steps

1. **Run database migrations** to add preference columns
2. **Test API endpoints** with curl or Postman
3. **Test frontend forms** in browser
4. **Verify i18n works** by switching languages
5. **Create sample resumes** with different templates
6. **Deploy to production** when all tests pass
