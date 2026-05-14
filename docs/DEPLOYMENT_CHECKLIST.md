# Deployment Checklist

## Frontend
- Set `VITE_API_URL` to the production backend API URL.
- Confirm the deployed domain matches the backend CORS configuration.
- Run:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`

## Backend
- Set:
  - `SECRET_KEY` (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)
  - `DATABASE_URL`
  - `FRONTEND_URL`
  - `ALLOWED_ORIGINS`
  - `LOG_LEVEL`
  - `ADMIN_SECRET` (mandatory in production; admin endpoint refuses without it)
  - Stripe vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
    `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX`
  - Cookie vars: `COOKIE_SAMESITE`, `COOKIE_SECURE`, `COOKIE_DOMAIN`
    (see `backend/app/core/config.py` for guidance)
  - optional `SENTRY_DSN`
  - mail provider env vars
- **First time only**: bring the existing prod DB under Alembic control with
  `cd backend && alembic stamp head`. See `backend/alembic/README.md`.
- Subsequent deploys run `alembic upgrade head` automatically via the
  Render `preDeployCommand` (see `render.yaml`). Confirm the deploy log shows
  the migration step succeeded.
- Confirm `/health` responds successfully.
- Confirm `/health/dependencies?deep=true` reports database + all providers
  reachable. Deep probes are cached for 30 s.
- Verify structured logs include `request_id`.

## Smoke Checks After Deploy
- Register a new account.
- Log in with an existing account.
- Verify email flow works.
- Open billing page and confirm usage counters load.
- Create, run, edit, and delete a job alert.
- Save a job and open job detail actions.

## Rollback Readiness
- Keep the last known-good frontend deployment available.
- Keep the last known-good backend release available.
- Do not rotate production secrets during an unrelated deploy unless required.
