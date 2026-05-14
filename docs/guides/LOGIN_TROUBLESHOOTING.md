# JobAssist - Login Troubleshooting Guide

## Problem: Page Refreshes Infinitely During Login

### Quick Diagnosis Checklist

- [ ] **Step 1: Open Developer Tools**
  - Press `F12` or right-click → "Inspect"
  - Go to "Console" tab
  - Look for red error messages

- [ ] **Step 2: Check Network Requests**
  - Click "Network" tab
  - Try to login
  - Look for failed requests (red X)
  - Check the response of the login request

- [ ] **Step 3: Verify Backend is Running**
  - Open terminal where backend should be running
  - Check if you see "Uvicorn running on http://127.0.0.1:8000"
  - If not, start the backend (see instructions below)

---

## Common Issues & Solutions

### Issue 1: Backend Not Running ❌

**Signs**:
- Network requests show "Connection refused" or "Failed to fetch"
- Console shows errors about API calls failing
- Login button doesn't respond

**Fix**:
```bash
cd backend
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

python -m uvicorn app.main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Verify it works**:
```bash
# In another terminal:
curl http://localhost:8000/docs
# Should open Swagger API docs
```

---

### Issue 2: Database Not Set Up ❌

**Signs**:
- Backend starts but login request returns 400/500 error
- Console shows "database" or "migration" errors

**Fix**:
```bash
cd backend

# Run migrations
python run_sql.py migrations/001_add_notes_column.sql
python run_sql.py migrations/002_add_deadline_column.sql
python run_sql.py migrations/003_create_resume_data_table.sql
python run_sql.py migrations/004_add_user_preferences.sql

# Restart backend
python -m uvicorn app.main:app --reload
```

---

### Issue 3: CORS Issues ❌

**Signs**:
- Network request shows "CORS error" or "Access to XMLHttpRequest blocked"
- Console shows error about CORS policy

**Fix** (check backend `app/main.py`):
```python
# Make sure this is in your app/main.py:
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Issue 4: Wrong API URL ❌

**Signs**:
- Network requests show "404 Not Found"
- Requests going to wrong endpoint

**Fix** (check `frontend/.env.local`):
```
VITE_API_URL=http://localhost:8000/api
```

Verify the URL in browser console:
```javascript
// Paste this in console and press Enter:
console.log(import.meta.env.VITE_API_URL)
// Should show: http://localhost:8000/api
```

---

### Issue 5: localStorage Issues ❌

**Signs**:
- Token appears to save but gets lost on page refresh
- Login works but then redirects to login again

**Fix** (check in browser console):
```javascript
// Check if localStorage is enabled:
localStorage.setItem("test", "value");
localStorage.getItem("test");
// Should return: "value"

// If it doesn't work, localStorage might be disabled
```

**Browser settings**:
- Check if Private/Incognito mode (disables localStorage)
- Check browser privacy settings - Allow localStorage

---

### Issue 6: Invalid Credentials 403 ❌

**Signs**:
- Login request returns 403 Forbidden or "Invalid credentials"
- Email/password shows "not found" error

**Fix**:
1. **Make sure you have an account**:
   - Go to `/register` and create a new account
   - Fill in: Email, Password, Full Name
   - Click "Create Account"

2. **If account exists but can't login**:
   - Try resetting password (if available)
   - Or create a new test account

3. **Test with curl** (replace email/password):
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "yourpassword"}'
   ```

   Should return:
   ```json
   {"access_token": "eyJ0eXAi...", "token_type": "bearer"}
   ```

---

## Step-by-Step Login Test

### 1. Start Backend
```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```
✅ Should see: `Uvicorn running on http://127.0.0.1:8000`

### 2. Start Frontend
```bash
# In another terminal
cd frontend
npm run dev
```
✅ Should see: `Local: http://localhost:5173`

### 3. Create Test Account
- Open http://localhost:5173/register
- Fill in:
  - Email: `test@example.com`
  - Password: `Test123!`
  - Full Name: `Test User`
- Click "Create Account"
- ✅ Should redirect to login page

### 4. Login
- Email: `test@example.com`
- Password: `Test123!`
- Click "Sign in"
- ✅ Should redirect to dashboard

### 5. Verify in Console
```javascript
// Open DevTools Console (F12)
// Paste and check:
localStorage.getItem("access_token")
// Should return a long JWT token starting with "eyJ..."
```

---

## Network Request Inspection

### How to Check Network Requests

1. Open DevTools (F12)
2. Go to "Network" tab
3. Try to login
4. Look for request to `/api/auth/login` (POST)
5. Click on it
6. Check "Response" tab

**Expected Response** (200 OK):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

**If you see errors**:
- **400 Bad Request**: Invalid email/password format
- **401 Unauthorized**: Wrong email/password
- **500 Server Error**: Backend crash - check backend terminal
- **Network Error**: Backend not running

---

## Console Error Messages

### "Cannot read property 'access_token' of undefined"
**Cause**: Login response doesn't have `access_token`
**Fix**: Check backend response format (see Network Inspection above)

### "Failed to fetch"
**Cause**: Backend not running or wrong URL
**Fix**: Start backend and check VITE_API_URL

### "Unauthorized" or "401"
**Cause**: Invalid credentials
**Fix**: Create new account or check password

### "CORS error"
**Cause**: Backend CORS not configured
**Fix**: Add CORS middleware to backend (see Issue 3 above)

---

## Verify Everything Works

Run this complete test:

```bash
# Terminal 1: Start Backend
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Terminal 3: Test login with curl
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# Expected output:
# {"access_token":"eyJ0eXAi...","token_type":"bearer"}
```

Then try logging in via the browser at http://localhost:5173/login

---

## Still Not Working?

1. **Collect Debug Info**:
   - Take screenshot of error
   - Copy console error messages
   - Note backend status

2. **Check Logs**:
   - Backend terminal - any errors?
   - Frontend console (F12) - any red messages?
   - Network tab - what request failed?

3. **Nuclear Option** (Reset Everything):
   ```bash
   # Stop both servers

   # Clear frontend cache
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run dev

   # Clear backend cache (if using)
   cd backend
   find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null
   python -m uvicorn app.main:app --reload
   ```

---

## Key Endpoints to Know

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Login Endpoint**: POST http://localhost:8000/api/auth/login
- **Me Endpoint**: GET http://localhost:8000/api/auth/me (with token)

---

**Last Updated**: March 14, 2026
