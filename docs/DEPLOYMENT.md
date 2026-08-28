# Deployment Guide — Vercel + Railway + Namecheap

End-to-end config to put JobAssist live at **jobassist.tech**:

```
jobassist.tech   (www + apex)  → Vercel   (React SPA, static, prerendered)
api.jobassist.tech              → Railway  (FastAPI + gunicorn/uvicorn)
DATABASE_URL                    → Neon Postgres (Frankfurt eu-central-1, already provisioned)
DNS                             → Namecheap (BasicDNS)
```

The repo is **already pre-wired** for exactly this split — the code, CSP, Procfile,
DB, and API-base detection are done. What's missing is only the cloud services,
the DNS records, and the production env vars.

---

## 0. Preflight — everything local is green

```bash
cd frontend && npm run lint && npm run build   # ✅ passes, prerenders impressum/terms/privacy
cd backend  && .venv-3.12/bin/python -m pytest -q   # ✅ 142 passed
```

The frontend auto-detects its API base with **no env var needed** on the real
domain (`frontend/src/services/api.js`):

| Host                         | API base URL                     |
|------------------------------|----------------------------------|
| `jobassist.tech` / `www`     | `https://api.jobassist.tech/api` |
| `localhost` / `127.0.0.1`    | `http://localhost:8000/api`      |

→ Do **not** set `VITE_API_URL` on Vercel. Leave it empty; prod uses the fallback.

---

## 1. Backend — create the Railway service

The old `jobassist-backend-production-abe8.up.railway.app` URL returns
**404 "Application not found"** — treat it as gone. Create a fresh one.

### 1.1 Create the service
1. Open <https://railway.app> → **New Project** → **Deploy from repo** → **GitHub**.
2. Connect your GitHub repo, **root directory = `/backend`** (the backend lives in
   a subfolder). Railway/Nixpacks auto-detects:
   - `nixpacks.toml` → Python 3.11 + `pip install -r requirements.txt`
   - `Procfile` → `gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --bind 0.0.0.0:$PORT`
   - Railway injects `PORT` and `DATABASE_URL` automatically (see below).
3. Wait for the first deploy; confirm the build installs `requirements.txt`.

> ⚠️ Railway sets `DATABASE_URL` to **its own Postgres plugin URL by default**
> (pointing to a `railway-postgres` host). That default string will **not** match
> your Neon — override it (step 1.3).

### 1.2 Env vars — Railway → backend service → Variables

Set **all** of these (values marked `(from backend/.env)` are already on disk —
copy the real values; never invent new ones):

| Key                      | Value                                                                  |
|--------------------------|------------------------------------------------------------------------|
| `DATABASE_URL`           | `postgresql+asyncpg://neondb_owner:***@ep-noisy-scene-b1tap4ls-pooler.c-5.eu-central-1.aws.neon.tech/neondb?ssl=require` — **not currently in `backend/.env`** (that file now points at local SQLite `./dev.db` for dev; leave it that way). Grab the Frankfurt URL fresh from the **Neon dashboard** (Project → Connect → Pooled connection), rewrite `postgresql://` → `postgresql+asyncpg://`, use **`?ssl=require`** (asyncpg accepts `ssl`, not `sslmode` — an `sslmode` URL crashes with `TypeError: connect() got an unexpected keyword argument 'sslmode'`; the code normalizes it, but prefer `ssl`), and keep the `-pooler` host (pooled = correct for Railway). |
| `SECRET_KEY`             | copy from `backend/.env` — must stay **stable** across restarts          |
| `ALGORITHM`              | `HS256`                                                               |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                                                              |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `30`                                                              |
| `COOKIE_SAMESITE`        | `lax`  (same-eTLD setup — see note below)                            |
| `COOKIE_SECURE`          | `true`                                                               |
| `COOKIE_DOMAIN`          | `.jobassist.tech`                                                     |
| `GROQ_API_KEY`           | copy from `backend/.env` (AI features)                               |
| `BREVO_API_KEY`          | copy from `backend/.env` (email)                                     |
| `EMAILS_FROM_EMAIL`      | copy from `backend/.env`                                             |
| `EMAILS_FROM_NAME`       | copy from `backend/.env`                                             |
| `FRONTEND_URL`           | `https://jobassist.tech`                                              |
| `ALLOWED_ORIGINS`        | `https://jobassist.tech,https://www.jobassist.tech`                  |
| `DEBUG`                  | `false`                                                              |
| `LOG_LEVEL`              | `INFO`                                                               |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | copy from `backend/.env` (job search)                        |
| `JOOBLE_API_KEY`         | copy from `backend/.env` (job search)                               |

**Cookie note:** because the frontend (`jobassist.tech`) and backend
(`api.jobassist.tech`) share the eTLD `.jobassist.tech`, the **same-eTLD cookie
setup is both simpler and more secure** than the old cross-site one:
`COOKIE_DOMAIN=.jobassist.tech`, `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=true`.
This is exactly why the frontend routes its API calls to the subdomain. Do **not**
use `COOKIE_SAMESITE=none` for this setup.

### 1.3 Database schema — run the Alembic migration at app start

For Postgres the app **does not** auto-create the schema (see `app/main.py`
`lifespan`: SQLite self-manages, Postgres is Alembic-owned).

**Railway gotcha:** the **pre-deploy step** runs in the *build* stage where
service env vars (`DATABASE_URL`) are **not** injected, so `alembic upgrade head`
there fails (deploy dies at `Pre deploy command`).

**Fix — run the migration inline in the Start Command** (the run container has
full env access; `alembic` and `gunicorn` are installed by `requirements.txt`):

```
alembic upgrade head && gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --bind 0.0.0.0:$PORT
```

- **Remove any pre-deploy step** (Railway → backend → Settings → Deploy → the
  **Pre-Deploy Command** field must be **empty**). A leftover pre-deploy step
  still runs `alembic` in the build stage — where `DATABASE_URL` is **not**
  available — and aborts the deploy at *`Pre deploy command failed`* even when
  the Start Command is correct. It is the #1 gotcha after switching to the
  inline migration.
- Keep **Healthcheck Path** set to `/health`.
- Safe on every deploy: `upgrade head` on an already-migrated DB is a no-op.

`alembic/env.py` reads `DATABASE_URL` from settings, so it picks up Neon
automatically. Verify `/health` → `database.ok` after deploy.

### 1.4 Get the public URL + domain
1. Railway → backend → **Settings → Networking → Generate Domain**.
2. You'll get a URL like `backend-production-xxxx.up.railway.app` — copy it.
   This is the **target of the `api` CNAME** in DNS (step 3).

---

## 2. Frontend — create the Vercel project

1. Open <https://vercel.com> → **Add New → Project** → import the **GitHub repo**.
2. Vercel auto-detects Vite. Confirm/adjust:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** `/` (the repo root has `vercel.json`, which does the
     `cd frontend && npm run build` and outputs `frontend/dist`). Either works —
     if you set root dir to `/frontend`, set build to `npm run build` and output
     to `dist`; the root `vercel.json` alternative is shown below.
3. **Env vars:** leave `VITE_API_URL` **empty** (frontend auto-detects the API).
   Nothing else required.
4. **Deploy.** Vercel gives you `your-app.vercel.app`. Take a note of it.
5. **Custom domain:** Settings → **Domains** → add `jobassist.tech` and
   `www.jobassist.tech`. Vercel will show you what to put in DNS:
   - apex `@` → Vercel's `A` record (usually `76.76.21.21`)
   - `www` → `CNAME` → `cname.vercel-dns.com.`

The root `vercel.json` already ships the correct security headers + CSP whose
`connect-src` allows `https://api.jobassist.tech` — no change needed.

> **Alternative (single-repo, Markdown-friendly) build pipeline**
> The repo root `vercel.json` is: build `cd frontend && npm install && npm run build`,
> output `frontend/dist`, with the SPA rewrite + security headers + CSP. If you
> import the repo **at the root**, Vercel uses that file verbatim. Either path is
> fine; the headers/CSP come from the root `vercel.json`.

---

## 3. Domain — Namecheap DNS (this is the currently-broken piece)

As of 2026-08-26 `jobassist.tech` is **NXDOMAIN** — Namecheap has *no* A/CNAME
records. Add them now.

1. Namecheap → Dashboard → **Domain List** → **Manage** → **Advanced DNS**.
2. Set **Nameservers** to **Namecheap BasicDNS**.
3. Under **Host Records**, add:

| Type  | Host | Value                                                    | TTL |
|-------|------|----------------------------------------------------------|-----|
| `A`     | `@`    | `76.76.21.21` *(or the A record Vercel tells you)*         | Auto |
| `CNAME` | `www`  | `cname.vercel-dns.com.`                                    | Auto |
| `CNAME` | `api`  | `backend-production-xxxx.up.railway.app.` *(from step 1.4)*| Auto |

   - `@` → Vercel frontend (apex)
   - `www` → Vercel
   - `api` → Railway backend
4. Save. Propagation on BasicDNS is usually minutes.

---

## 4. Verify end-to-end

```bash
# DNS resolves
host jobassist.tech && host api.jobassist.tech

# Frontend + API reachable over HTTPS
curl -sI https://jobassist.tech | head -3
curl -s  https://api.jobassist.tech/health | head -c 200

# Health + provider report (expect database.ok)
curl -s https://api.jobassist.tech/health/dependencies | python3 -m json.tool

# Warm+cold latency (expect /init ≈0.5–0.9s, /jobs ≈0.3s after DB swap)
for p in health init jobs; do
  curl -s -o /dev/null -w "/$p  %{http_code}  %{time_total}s\n" --max-time 15 "https://api.jobassist.tech/$p"
done
```

In the browser: open `https://jobassist.tech`, register, log in, then
**Stellen → Finden** with `willhaben` or **karriere.at** as source. Verify the
browser console shows `API URL: https://api.jobassist.tech/api` (not localhost).

---

## 5. Post-deploy sanity & hygiene

- **Verification e-mail:** open Brevo → Settings → API Keys → ensure your deploy
  IP (Railway's egress / `<api-your region>`) is allowlisted, or use an
  unrestricted key. Then in the app: dashboard → **E-Mail bestätigen** → **Erneut
  senden**, check the HTML renders (the branded template).
- **Rotate secrets:** the Neon password in `backend/.env` was pasted into chat
  during an earlier session — rotate it in Neon and update **both** `backend/.env`
  and the Railway variable. Also rotate anything that was shared.
- **Billing disabled:** Stripe/Sentry/VAPID are optional and off — no action
  needed unless you later enable payment/push.

---

## 6. Troubleshooting recap

| Symptom | Cause | Fix |
|---|---|---|
| `jobassist.tech` doesn't load | No A/CNAME at Namecheap | Add Host Records (step 3); wait for propagation |
| Browser console API = `localhost` | `VITE_API_URL` set, or hostname mismatch | Unset `VITE_API_URL` on Vercel; clear caches; redeploy |
| `Could not validate credentials` | stale JWT + failed refresh | Log out/in; check `SECRET_KEY` stable, user row exists |
| `/api` 404s | cookie/DNS `api` CNAME wrong | Confirm `api` CNAME → Railway URL; wait propagation |
| Job search empty (Adzuna source) | API keys invalid | Check `adzuna.configured` in `/health/dependencies`; circuit breaker |
| No verification e-mail | Brevo key IP-restricted or sender unverified | Allowlist deploy IP in Brevo; verify sender |
| New deploy can't find tables | Alembic not run / wrong `DATABASE_URL` | Run `alembic upgrade head`; fix Railway DB var to Neon |
| Deploy crashes at startup with `TypeError: connect() got an unexpected keyword argument 'sslmode'` | `DATABASE_URL` uses psycopg2-style `?sslmode=require` on an `+asyncpg` URL; SQLAlchemy passes `sslmode` straight to asyncpg, which only accepts `ssl` | Change the URL to `?ssl=require` (the app normalizes `sslmode` → `ssl` as a safety net, but fix the var) and redeploy |
| Deploy fails at `Pre deploy command` | A **leftover Pre-Deploy Command** still runs `alembic` in the build stage where `DATABASE_URL` isn't available | Delete the Pre-Deploy Command field entirely (Settings → Deploy → Pre-Deploy must be empty); keep migration only in the Start Command (see §1.3) |