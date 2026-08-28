# Local Setup — run JobAssist end-to-end

Everything below was verified against this repo on 2026-08-28. One command to
boot everything:

```bash
./scripts/dev.sh          # backend :8000 + frontend :5173, Ctrl+C stops both
```

Then open **http://localhost:5173**, register/login, and go to
**Stellen → Finden** to search Austrian jobs.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.12 | `python3.12 --version` |
| Node | ≥ 20 | `node --version` |

One-time install:

```bash
cd backend && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd ../frontend && npm install
```

## 2. Environment

### Backend — `backend/.env` (copy from `backend/.env.example`)

**Required**

| Key | Local value | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./dev.db` (zero-setup) or your own Postgres | Database. SQLite schema is auto-created on startup |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` | JWT signing. Must stay **stable across restarts** or every token invalidates ("Could not validate credentials") |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS for the Vite dev server |
| `DEBUG` | `true` | Local only — also relaxes the SECRET_KEY guard |

**Already configured in this repo's `.env` (verified via `/health/dependencies`)**

| Key | Status | Powers |
|---|---|---|
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | ✅ configured | **Job search (Austria)** — Stellen → Finden, default source |
| `GROQ_API_KEY` | ✅ configured | AI features (Polish, Anschreiben, KI-Assistent) |
| `BREVO_API_KEY` | ✅ configured | E-mail sending (verification, job alerts) |
| `JOOBLE_API_KEY` | ✅ configured | Stellen → Finden source „Jooble“ (aggregates karriere.at, stepstone.at …) |

**Optional**

| Key | Get it | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | provider consoles | Alternative AI providers |
| `KV_DEFAULT_SOURCE_URL` | — | "Quelle" link on KV wage cards |

Keyless scrapers (no config needed): **willhaben.at**, **karriere.at** — both
repaired 2026-08 to the current site markup (Willhaben moved to a Next.js
search page; karriere.at only server-renders the SEO path `/jobs/{keyword}/{location}`).
AMS (`jobs.ams.at`) is **unavailable without a login** since the portal became
an OIDC-gated SPA — the „AMS“ source returns a friendly error instead of a
broken search.

Not needed locally: Stripe (billing disabled — app is free), Sentry, VAPID (web push), SMTP (Brevo is active).

Not needed locally: Stripe (billing disabled — app is free), Sentry, VAPID (web push), SMTP (Brevo is active).

### Frontend — `frontend/.env.local`

```
VITE_API_URL=http://localhost:8000/api
```

⚠ **The value must end with `/api`** — every backend router is mounted under
`/api`. A previous version of this file pointed at the Railway production URL
(and a duplicate line without `/api` was winning) — that mismatch is exactly
what produced real-backend errors like "Could not validate credentials" in
local dev. The current file is fixed.

## 3. Run

```bash
./scripts/dev.sh              # both
./scripts/dev.sh backend      # backend only
./scripts/dev.sh frontend     # frontend only
```

Manual equivalent:

```bash
# terminal 1
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
# terminal 2
cd frontend && npm run dev
```

## 4. Verify

```bash
curl localhost:8000/health                          # {"status":"ok"}
curl localhost:8000/health/dependencies             # providers report
```

Green means: `database.ok`, `groq.configured`, `adzuna.configured`,
`email.active_provider=brevo`. `ready:false` is expected locally — it only
flags missing **Stripe** (billing is disabled).

In the browser: the dev console logs `🔌 API URL: http://localhost:8000/api`
on boot. Register → login → **Stellen → Finden**.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Could not validate credentials` toasts | Stale/invalid JWT + failed refresh | Log out & back in. If it returns instantly: `SECRET_KEY` changed between backend restarts, or the user row is missing after a DB swap |
| `ERRNO 98 address already in use` on :8000 | Backend already running | `kill $(lsof -t -i:8000)` or reuse it (`scripts/dev.sh` detects this) |
| 404 on every API call from the frontend | `VITE_API_URL` missing the `/api` suffix | Fix `frontend/.env.local`, restart Vite |
| Job search returns nothing | Adzuna keys missing/invalid | Check `adzuna.configured` + `circuit_breaker.open` in `/health/dependencies` |
| No verification e-mail | Brevo key invalid / sender not verified | Check Brevo dashboard senders; `email.brevo_configured` must be true |
