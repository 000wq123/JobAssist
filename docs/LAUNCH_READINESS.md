# Launch Readiness Checklist

This document tracks what's done, what's blocked on you, and what to do next.

## Done (code-complete)

| Item | Status | Notes |
|---|---|---|
| Auth system (JWT + refresh token rotation) | Done | httpOnly cookies, one session per user |
| Device fingerprinting (1 account per phone) | Done | Blocks duplicate registration, stores on login |
| Persistent login | Done | Silent refresh on boot, no login flash |
| Email verification (soft) | Done | Banner shows, doesn't block app use |
| Rate limiting | Done | SlowAPI on auth, contact, upload endpoints |
| File upload validation | Done | PDF magic bytes check, 5MB limit |
| Security headers + CSP | Done | Via middleware + Vercel headers |
| Stripe billing integration | Done | Checkout, portal, webhooks |
| CV Builder wizard | Done | 6-step wizard, autosave, PDF export, 5 templates |
| Jooble job search | Done | Aggregates karriere.at, stepstone.at, etc. via API |
| Native scrapers (karriere.at, willhaben, AMS) | Done | Direct HTML scraping with rate limiting and graceful degradation |
| Backend tests | Done | 19 test files covering auth, billing, jobs, IDOR |
| Frontend tests | Done | Vitest + Testing Library configured, auth store tests added |
| CI/CD pipeline | Done | GitHub Actions with lint, test, audit |
| Lint | Passing | `npm run lint` clean |
| Build | Passing | `npm run build` clean |

## Needs Your Action (infra / accounts)

### 1. Railway Backend Deployment
- [ ] Set `SECRET_KEY` — run `python -c "import secrets; print(secrets.token_urlsafe(48))"`
- [ ] Set `DATABASE_URL` (Railway Postgres auto-creates this)
- [ ] Set `GROQ_API_KEY` (get from groq.com)
- [ ] Set `JOOBLE_API_KEY` (get from jooble.org/api — free tier: 500 req/day)
- [ ] Set `BREVO_API_KEY` (get from brevo.com)
- [ ] Set `FRONTEND_URL=https://jobassist.tech`
- [ ] Set `ALLOWED_ORIGINS=https://jobassist.tech,https://www.jobassist.tech`
- [ ] Set `COOKIE_SAMESITE=none` (until you move backend to `api.jobassist.tech`)
- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `ADMIN_SECRET` (strong random string)
- [ ] Optional: `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### 2. First Database Migration
- [ ] In Railway shell: `cd backend && alembic upgrade head`

### 3. Vercel Frontend Deployment
- [ ] Connect GitHub repo to Vercel
- [ ] Set `VITE_API_URL=https://your-railway-app.up.railway.app/api`
- [ ] Add custom domain: `jobassist.tech`

### 4. Domain + DNS
- [ ] Point `jobassist.tech` A record to Vercel
- [ ] Point `api.jobassist.tech` CNAME to Railway app (recommended for cookie SameSite=lax)
- [ ] Configure SSL (Vercel + Railway handle this automatically)

### 5. Brevo Email Setup
- [ ] Add `jobassist.tech` domain in Brevo
- [ ] Add DKIM/SPF DNS records (Brevo provides these)
- [ ] Verify sender domain
- [ ] Test transactional send

### 6. Stripe (if accepting payments)
- [ ] Create Stripe account
- [ ] Create Pro + Max products
- [ ] Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX`
- [ ] Configure webhook endpoint: `POST /api/billing/webhook`

## Post-Deploy Smoke Tests

After everything is deployed, run through:
1. Register a new account
2. Log in, close tab, reopen → still logged in
3. Try to register again with same device → blocked by fingerprint
4. Verify email flow (check spam folder too)
5. Upload a CV (PDF)
6. Save a job from search
7. Open billing page, confirm usage counters load
8. Create, edit, delete a job alert
9. Log out and back in

## Features NOT in v1 (backlog for later)

These are explicitly out of scope for launch:
- Job Inbox with AI rules (P3)
- "Lohnt sich das?" wage checker (P4)
- Bewerbungsfristen calendar (P5)
- Chrome extension / Autopilot (P6)
- Web push notifications (P7)
- PWA install prompts (P7)
- WhatsApp notifications (P11)

## Current State

**This codebase is ready for a closed beta.** Core auth, job tracking, billing, AI features, CV builder, Jooble search, and native scrapers (karriere.at, willhaben.at, jobs.ams.at) are complete. Austrian job board coverage is now comprehensive — both aggregated (Jooble) and direct (scrapers). Ship to friends first, gather feedback, then iterate.
