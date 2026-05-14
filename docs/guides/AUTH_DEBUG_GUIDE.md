# Authentication Debugging Guide

## Issue
You're getting "not authenticated" errors when trying to search for jobs, even though you're logged in.

## Quick Diagnosis Steps

### Step 1: Verify Token in Storage
Open browser DevTools (F12) and run this in the **Console** tab:
```javascript
localStorage.getItem("access_token")
```
**Expected:** A long string starting with `eyJ...`
**If you see `null` or `undefined`:** The token wasn't saved after login. See **Fix #1** below.

### Step 2: Verify Authorization Header
1. Open DevTools **Network** tab
2. Try a job search (either Recommended or Custom)
3. Click on the failing request to `/jobs/search/custom` or `/jobs/search/recommended`
4. Go to the **Headers** section
5. Look for `Authorization` in the **Request Headers**
6. It should show: `Authorization: Bearer eyJ...`

**If Authorization header is missing:** See **Fix #2** below.
**If it's there but you still get 401:** The token is expired. See **Fix #3** below.

### Step 3: Test Token Validity
If you have the token, test it with this endpoint. In the browser console:
```javascript
fetch('/api/auth/debug/token-info', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log)
```

**Expected:** `{ status: "valid", user_id: 1, expires_at: 1234567890, ... }`
**If invalid:** Token is corrupted or using wrong SECRET_KEY. See **Fix #3**.

---

## Common Fixes

### Fix #1: Token Not Saved to localStorage
**Symptoms:** `localStorage.getItem("access_token")` returns `null`

**Solution:**
1. Log in again
2. Immediately check localStorage (Step 1 above)
3. If still null, there's an issue with the login response

**Debug the login:**
```javascript
// In browser console after clicking login
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your@email.com', password: 'password' })
}).then(r => r.json()).then(d => {
  console.log('Login response:', d);
  if (d.access_token) localStorage.setItem('access_token', d.access_token);
})
```

### Fix #2: Authorization Header Not Sent
**Symptoms:** Network tab shows no Authorization header

**Solution:**
The axios interceptor should be attaching the token automatically. If it's not:

1. **Check if axios is using the right instance:**
   - All API calls in the code use `api.get()`, `api.post()`, etc.
   - This is the instance with the interceptor attached
   - If any code calls `axios.get()` directly, it will bypass the interceptor

2. **Clear browser cache/storage and reload:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   // Then reload page and log in again
   ```

3. **Verify interceptor is running:**
   ```javascript
   // Add this to frontend/src/services/api.js before exporting
   api.interceptors.request.use((config) => {
     console.log('Request interceptor - Adding auth header', config);
     const token = localStorage.getItem("access_token");
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
       console.log('Authorization header set');
     } else {
       console.warn('No token in localStorage!');
     }
     return config;
   });
   ```
   Then check the browser console when making a request.

### Fix #3: Token Expired
**Symptoms:** Token exists and is sent, but you get "not authenticated"

**Solution:**
The ACCESS_TOKEN_EXPIRE_MINUTES is set to 1440 (24 hours) in config.py.
If your token is older than 24 hours, it's expired.

1. **Delete the old token:**
   ```javascript
   localStorage.removeItem("access_token");
   ```

2. **Log in again**

3. **Optional:** Reduce token expiry for testing:
   Edit `backend/app/core/config.py`:
   ```python
   ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
   ```

---

## Complete Test Checklist

After each fix, run through this:

1. ✅ Log in successfully
2. ✅ Check: `localStorage.getItem("access_token")` returns a token
3. ✅ Open Network tab
4. ✅ Click "Search Recommended" or search for a job
5. ✅ Check the request in Network tab - should have `Authorization: Bearer ...` header
6. ✅ Request should return 200 with job results (not 401)

---

## If Still Stuck

### Enable Backend Logging
Edit `backend/app/api/routes/jobs.py` and add this to the search endpoints:
```python
import logging
logger = logging.getLogger(__name__)

@router.get("/search/recommended", response_model=dict)
async def search_recommended_jobs(...):
    logger.info(f"Incoming request - auth user: {current_user}")  # This logs the authenticated user
    logger.info(f"Current user ID: {current_user.id}")
    # ... rest of function
```

Then check your backend console output when making requests.

### Check Backend Configuration
Make sure `backend/.env` has:
```
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

And these match what's in `backend/app/core/config.py`.

---

## Solution Summary

The authentication flow should be:
```
Login → Token saved to localStorage
           ↓
Make API Request
           ↓
Axios interceptor reads token from localStorage
           ↓
Adds Authorization: Bearer <token> to request
           ↓
Backend receives request with Authorization header
           ↓
FastAPI OAuth2PasswordBearer extracts token from header
           ↓
get_current_user() validates token and returns User object
           ↓
Endpoint executes with current_user available
```

If any step fails, you'll get "not authenticated".
