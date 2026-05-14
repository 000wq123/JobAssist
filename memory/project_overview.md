---
name: JobAssist SaaS Project Overview
description: Austrian job-application SaaS — tech stack, key files, known patterns and fixed bugs
type: project
---

## Stack
- **Frontend**: React 18, Vite, TailwindCSS, React Query, React Router, Zustand (useAuthStore), react-hook-form, Axios
- **Backend**: Python FastAPI, SQLAlchemy async, PostgreSQL
- **Auth**: JWT access token + refresh token (stored in localStorage)
- **AI**: Claude / Groq for cover letters, interview prep, job matching, research
- **Job Search**: Adzuna API
- **Email**: Brevo / SMTP
- **Payments**: Stripe (Pro €4.99/mo, Max €7.99/mo)
- **Deploy**: Vercel (frontend), Railway (backend)

## Key paths
- Frontend pages: `frontend/src/pages/`
- Main API client: `frontend/src/services/api.js`
- Auth store (Zustand): `frontend/src/hooks/useAuthStore.js`
- Backend routes: `backend/app/api/routes/`
- Plan limits: `backend/app/core/plans.py`

## Pricing (correct as of 2026-03-29)
- Basic: Free
- Pro: €4.99/mo (15 CV analyses, 25 cover letters, 200 AI messages, 20 job searches/day)
- Max: €7.99/mo (unlimited everything)
- Enterprise: On request

**Why:** There was a price inconsistency — PricingPage showed Max at €14.99, BillingPage showed €7.99. Fixed to €7.99 everywhere.

## Fixed bugs (2026-03-29)
1. `api.js searchCustom` — params not URL-encoded → fixed with URLSearchParams
2. `useAuthStore login/logout` — missing `profile`, `preferences`, `job-search-research` keys in localStorage cleanup → data leak between users
3. `BillingPage` — "Upgrade auf Pro" shown to Pro users → should say "Upgrade auf Max"
4. `UpgradeModal` — auto-dismissed after 8s → removed auto-dismiss
5. `LoginPage` / `RegisterPage` / `ResetPasswordPage` — no password visibility toggle → added Eye/EyeOff
6. `RegisterPage` — no confirm password field, no password strength validation (while reset had both) → added both
7. `backend/auth.py ResetPasswordRequest` — no password strength validator (while UserCreate had one) → added
8. `backend/jobs.py` — duplicate `from app.models.resume import Resume` import → removed
9. `plans.py` + `PricingPage.jsx` — Max plan price `14.99` vs `7.99` inconsistency → fixed to `7.99`

## How to apply
Use these notes when making changes to auth, billing, or pricing flows. The correct Max plan price is €7.99.
