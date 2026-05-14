# Operations Runbook

## Health Endpoints
- `GET /health`
  - basic liveness
  - includes `request_id`
- `GET /health/dependencies`
  - database connectivity
  - Groq configuration
  - Adzuna configuration and circuit-breaker state
  - email provider availability
  - Stripe configuration
  - Sentry configuration
  - `ready` flag for deploy checks

## First Checks During an Incident
1. Check `/health`
2. Check `/health/dependencies`
3. Inspect backend logs for the same `request_id`
4. Confirm frontend is calling the expected backend URL
5. Confirm provider env vars are present in production

## Common Failure Modes
- `ready=false` with `database.ok=false`
  - database unavailable or migrations not applied
- `ready=false` with `providers.email.active_provider=null`
  - no email provider configured
- `providers.adzuna.circuit_breaker.open=true`
  - upstream job provider is currently failing repeatedly
- Groq not configured
  - AI endpoints will fail or be degraded

## Deploy Verification
1. `curl /health`
2. `curl /health/dependencies`
3. Log in via the frontend
4. Create and run a job alert
5. Generate one AI action
6. Confirm request logs contain `request_id`
