# JobAssist

AI-assisted job-search & application-tracking SaaS. Users upload a CV, get
LLM-generated match scores, cover letters, and interview prep against jobs
they've saved, and run scheduled job-board searches (Adzuna) on a daily
budget tied to their billing plan.

## Stack

- **Frontend:** React 18 + Vite + Tailwind, Vitest + Playwright for tests.
- **Backend:** FastAPI (Python 3.11+), SQLAlchemy 2 async, Alembic for
  schema, slowapi for rate-limiting.
- **Data:** PostgreSQL (production), SQLite (tests). Stripe for billing.
- **AI / external:** Groq (LLM), Adzuna (job search), Sentry (errors),
  pluggable email provider.

## Getting started

1. **Clone + install** — `docs/guides/QUICK_START.md` for the five-minute
   path, `docs/guides/SETUP.md` for the detailed walkthrough.
2. **Backend env** — copy `backend/.env.example` to `backend/.env`, fill
   in `SECRET_KEY`, `DATABASE_URL`, `GROQ_API_KEY`, Stripe keys, etc.
3. **Frontend env** — copy `frontend/.env.example` to `frontend/.env`,
   set `VITE_API_URL`.
4. **Run** —
   - Backend: `cd backend && uvicorn app.main:app --reload`
   - Frontend: `cd frontend && npm install && npm run dev`

## Project layout

```text
backend/      FastAPI service, SQLAlchemy models, Alembic migrations, pytest suite
frontend/     React SPA, Vitest unit/component tests, Playwright e2e tests
docs/         Long-form docs — start with docs/README.md
memory/       Session notes used by AI agents
scripts/      One-shot maintenance scripts
render.yaml   Render.com deployment manifest
vercel.json   Vercel deployment config for the SPA
```

## Common commands

```bash
# Frontend
cd frontend
npm run dev                 # local dev server on :5173
npm run lint                # ESLint (CI gate)
npm run test                # Vitest unit + component tests
npx vitest run --coverage   # coverage report → coverage/ + console summary
npm run test:e2e            # Playwright (requires test:e2e:install first)
npm run build               # production build → dist/

# Backend
cd backend
uvicorn app.main:app --reload    # local dev server on :8000
pytest                           # full test suite
alembic upgrade head             # apply pending migrations
alembic revision --autogenerate -m "<message>"   # create a new migration
```

## Where to read next

- **Deploying** — `docs/DEPLOYMENT_CHECKLIST.md`
- **On-call / incidents** — `docs/OPERATIONS_RUNBOOK.md`
- **Security** — `docs/SECURITY_THREAT_MODEL.md`
- **Privacy / GDPR** — `docs/PRIVACY_POLICY.md`, `docs/DPA_TEMPLATE.md`
- **Contributing rules (humans + AI)** — `AGENTS.md`
- **Index of every other doc** — `docs/README.md`
