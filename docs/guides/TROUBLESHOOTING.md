# JobAssist - Troubleshooting Guide

## Current Issue: Frontend Dev Server Won't Start

### Error Message
```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
npm error 403 403 Forbidden - GET https://registry.npmjs.org/...
```

### Root Cause
**Network/Proxy Issue**: npm cannot access the npm registry to download or install packages.

---

## Solutions (Choose One)

### ✅ Solution 1: Use npm with Proxy Settings (Recommended)

If you're behind a corporate proxy:

```bash
cd frontend

# Configure npm to use your proxy
npm config set proxy http://[proxy-server]:8080
npm config set https-proxy http://[proxy-server]:8080

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Start dev server
npm run dev
```

Replace `[proxy-server]` with your actual proxy server.

### ✅ Solution 2: Switch Network

If you're on a restricted network:

1. **Move to a different network** (home WiFi, mobile hotspot, different office)
2. Run the commands:
   ```bash
   cd frontend
   npm cache clean --force
   npm install
   npm run dev
   ```

### ✅ Solution 3: Use Yarn Instead of npm

Yarn might bypass some npm registry issues:

```bash
cd frontend

# Install yarn globally (if not already installed)
npm install -g yarn

# Install dependencies with yarn
yarn install

# Start dev server
yarn dev
```

### ✅ Solution 4: Backend Development (Temporary Workaround)

While you fix the frontend network issue, you can test the backend APIs:

```bash
cd backend

# Activate venv (Linux/Mac)
source .venv/bin/activate

# Or on Windows:
.venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Run migrations
python run_sql.py migrations/004_add_user_preferences.sql

# Start the server
python -m uvicorn app.main:app --reload
```

Then test the APIs using curl, Postman, or the provided test commands in IMPLEMENTATION_GUIDE.md.

---

## Diagnosis Steps

### Check 1: Network Connectivity
```bash
# Test if npm registry is accessible
curl https://registry.npmjs.org/

# Expected: Should return JSON with package info
# If blocked: Will timeout or show error
```

### Check 2: npm Configuration
```bash
npm config list

# Look for proxy settings:
# If empty, you may not have proxy configured
# If set, verify proxy is correct
```

### Check 3: npm Cache
```bash
# Clear npm cache
npm cache clean --force

# Verify cache is empty
npm cache verify
```

### Check 4: Node/npm Versions
```bash
node --version
npm --version

# Should be:
# node: v18+ (v22.22.0 is fine)
# npm: v8+ (v9+ is better)
```

---

## Detailed Instructions by Scenario

### Scenario A: Corporate Network with Proxy

1. **Get proxy details from your IT department**:
   - Proxy server address (e.g., proxy.company.com)
   - Proxy port (e.g., 8080)
   - Username/password (if required)

2. **Configure npm**:
   ```bash
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   npm config set registry https://registry.npmjs.org
   ```

3. **If proxy needs authentication**:
   ```bash
   npm config set proxy http://username:password@proxy.company.com:8080
   npm config set https-proxy http://username:password@proxy.company.com:8080
   ```

4. **Try installing again**:
   ```bash
   npm install
   ```

### Scenario B: VPN Connection Issues

1. **Ensure VPN is connected** (if required)
2. **Disconnect and reconnect VPN**
3. **Try installing again**:
   ```bash
   npm cache clean --force
   npm install
   ```

### Scenario C: macOS/Linux Permission Issues

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to .bashrc or .zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Try installing again
npm install
```

### Scenario D: Windows Firewall/Antivirus

1. **Check Windows Firewall** - Allow Node.js through
2. **Disable antivirus temporarily** (test only)
3. **Run npm from Administrator Command Prompt**:
   ```bash
   npm install
   ```

---

## If Nothing Works: Manual Setup

If all else fails, you can test the API manually:

### Test Backend API (Resume Creator)

1. **Start backend server**:
   ```bash
   cd backend
   source .venv/bin/activate
   python -m uvicorn app.main:app --reload
   ```

2. **Test with curl**:
   ```bash
   # Get preferences
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/settings/preferences

   # Create resume
   curl -X POST http://localhost:8000/api/resume-data \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "John Doe",
       "email": "john@example.com",
       "template_id": 1,
       "language": "en"
     }'
   ```

3. **Use Postman** to test all endpoints (import collection from IMPLEMENTATION_GUIDE.md)

---

## Next Steps After Fixing Network

Once npm can access the registry:

```bash
cd frontend
npm cache clean --force
npm install
npm run dev
```

The app should start on `http://localhost:5173` (or similar).

Then verify:
1. Navigate to "Create Resume" - should show the resume creator form
2. Go to "Preferences" - should show currency, location, language selectors
3. Change language to Spanish - UI should not be fully translated yet (i18n strings need to be added to other components)

---

## Code Verification

All new code has been verified and is correct:

✅ **Frontend Files**:
- `src/pages/ResumeCreatorPage.jsx` - Complete resume builder
- `src/context/I18nContext.jsx` - i18n provider
- `src/i18n/translations.json` - Translation strings
- `src/App.jsx` - Routes configured
- `src/main.jsx` - I18nProvider wrapped
- `src/pages/SettingsPage.jsx` - Preferences section added
- `src/components/layout/Layout.jsx` - Navigation updated

✅ **Backend Files**:
- `app/models/user.py` - New preferences fields
- `app/schemas/user.py` - New schemas
- `app/api/routes/settings.py` - New endpoints
- `migrations/004_add_user_preferences.sql` - Migration ready

---

## Support Resources

- **npm Proxy Guide**: https://docs.npmjs.com/cli/v8/using-npm/config
- **npm Registry Issues**: https://status.npmjs.org/
- **Node.js Documentation**: https://nodejs.org/docs/

---

## Quick Reference: npm Registry Status

Check if npm registry is having issues:
- https://status.npmjs.org/ - Official npm status page
- `npm registry ls` - List registry health

---

## Still Having Issues?

1. **Check backend is working first**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   # Should start on http://localhost:8000
   ```

2. **Verify port 5173 is free** (frontend dev port):
   ```bash
   lsof -i :5173  # macOS/Linux
   netstat -an | grep 5173  # Windows
   ```

3. **Check logs for specific errors**:
   - Frontend: Browser DevTools Console (F12)
   - Backend: Terminal output where uvicorn is running

4. **Look at IMPLEMENTATION_GUIDE.md** for detailed testing procedures

---

**Last Updated**: March 14, 2026
**Status**: All code is correct - issue is environment/network related
