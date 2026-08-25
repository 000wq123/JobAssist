# Runbook: Swap Railway `DATABASE_URL` to Frankfurt (Neon eu-central-1)

**Status:** PENDING — this is the single highest-value remaining ops action.
**Context:** The Neon us-east-1 → Frankfurt migration completed 2026-08-25 and was
verified locally (see `scripts/neon_migrate.py`, `scripts/neon_fix_sequences.py`).
Local `.env` already points at Frankfurt. Railway production still points at the
old us-east-1 project, which is slow (`/init` ~5s, `/jobs` broken→3.8s pre-fix).

## Step 0 — Grab the Frankfurt connection string

It is already on disk, line 4 of `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:<PASSWORD>@ep-noisy-scene-b1tap4ls-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Copy the whole value exactly (keep the `-pooler` host — pooled connections are
what you want for serverless/Railway; do **not** use the direct/non-pooler host).

> ⚠️ Hygiene note: this password was pasted into chat during the migration
> session. Rotate it in Neon (Project → Roles → neondb_owner → Reset password)
> when convenient, then update BOTH `backend/.env` and this Railway variable.

## Step 1 — Update the variable in Railway

1. Open <https://railway.app> → your JobAssist project → **backend** service.
2. Tab **Variables** → find `DATABASE_URL`.
3. Paste the Frankfurt string from Step 0 → **Update**.
4. A redeploy triggers automatically on variable change. Watch the
   **Deployments** tab until the new deploy is green (~2 min).
5. Sanity-check the logs: no `connection refused` / DNS errors to
   `eu-central-1.aws.neon.tech` after startup.

If other services also reference the old URL via a **shared variable**
(e.g. a project-level `DATABASE_URL`), update that instead so everything moves
together. Check Worker/Cron services too.

## Step 2 — Verify prod latency

⚠️ Blocked until `api.jobassist.tech` resolves again: as of 2026-08-26 it is
NXDOMAIN from Cloudflare (1.1.1.1) and Google (8.8.8.8) public resolvers. Apex
`jobassist.tech` has Namecheap BasicDNS nameservers but no A record either.
Fix the DNS records at Namecheap first, then run:

```bash
# Warm + cold timing check (expect /init ≈0.5–0.9s, /jobs ≈0.3s like local)
for p in health init jobs; do
  curl -s -o /dev/null -w "/$p  %{http_code}  %{time_total}s\n" \
    --max-time 15 "https://api.jobassist.tech/$p"
done
```

Notes:
- `/init` and `/jobs` need an authenticated session; register a fresh account
  first (the perf-test user doesn't exist in prod). Expect an ETag/304 on
  repeat calls — a 304 is a pass.
- If latency is still bad, confirm which DB the running deploy actually uses:
  Railway service → Variables → check the deployed revision picked up the new
  value (deployment metadata shows variable snapshot per deploy).

## Step 3 — Aftermath (only once prod is confirmed good)

1. Delete the old us-east-1 Neon project (destructive — deliberately skipped).
2. Rotate the Frankfurt password (see warning above) if not done yet.
