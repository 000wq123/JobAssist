# Security Threat Model

**Owner:** engineering lead.  
**Review cadence:** every release that touches auth, payments, file upload,
or third-party providers.  
**Last full review:** 2026-05-14.

This document is intentionally short and concrete. It is a working reference,
not a compliance artefact. If a section starts contradicting the code,
update this document in the same PR.

---

## 1. System under threat

JobAssist is a multi-tenant SaaS that lets each user:

- store CVs and structured profile data;
- save jobs scraped from Adzuna or entered manually;
- request LLM (Groq) actions against those CVs and jobs (match score,
  cover letter, interview prep);
- pay for higher quotas via Stripe Checkout.

### 1.1 Trust boundaries

```text
                ┌──────────────────────────┐
   Browser ───► │  Frontend SPA            │ (Vite/React, public)
                │  jobassist.tech          │
                └────────────┬─────────────┘
                             │  HTTPS, withCredentials=true
                             ▼
                ┌──────────────────────────┐
                │  Backend API (FastAPI)   │ (Render web service)
                │  api.* / railway.app     │
                └────┬──────┬──────┬───────┘
                     │      │      │
            ┌────────▼┐  ┌──▼───┐  ┌──▼────────┐
            │Postgres │  │Stripe│  │ Groq /    │
            │(Render) │  │      │  │ Adzuna /  │
            └─────────┘  └──────┘  │ email     │
                                   └───────────┘
```

Each arrow is a trust boundary. Anything crossing one must be authenticated
and validated.

### 1.2 Assets (in priority order)

1. **User credentials** — `users.hashed_password` (bcrypt), refresh tokens
   (httpOnly cookie, `refresh_tokens` table).
2. **CV content** — `resumes.raw_text` + `resumes.parsed_json` contain
   employment history, education, sometimes addresses & phone numbers.
3. **Payment identifiers** — Stripe customer / subscription IDs.
   Card data itself is **never** stored locally (Stripe-hosted Checkout).
4. **Personal preferences** — `user_profiles.*`, including `avatar`
   (base64 image embedded in the row).
5. **AI outputs** — cover letters / interview Q&A persisted per `jobs`
   row. Lower sensitivity but still user-private.
6. **Operational secrets** — `SECRET_KEY`, `ADMIN_SECRET`,
   `STRIPE_*`, `GROQ_API_KEY`, `ADZUNA_*`, SMTP creds.

---

## 2. STRIDE walkthrough

Each row lists the threat, the current mitigation in code, and the
residual risk an on-call engineer should remember.

### Spoofing

| Threat | Mitigation | Residual risk |
|---|---|---|
| Attacker impersonates a user via stolen access token | Access token is a 30-min JWT (`ACCESS_TOKEN_EXPIRE_MINUTES`); refresh token lives only in an `HttpOnly; Secure; SameSite=None\|Lax` cookie (`backend/app/core/auth_cookies.py`). XSS cannot read it. | Phishing or device theft still wins. Browser session-cookie compromise via malicious browser extension is undetectable. |
| Attacker forges an admin call | `/admin/*` requires `X-Admin-Secret` header equal to `ADMIN_SECRET`; rate-limited 3/min; client IP + outcome audit-logged (`app/main.py`). | `ADMIN_SECRET` rotation must be done manually — no automation. |
| Forged Stripe webhook | `stripe.Webhook.construct_event(...)` validates `STRIPE_WEBHOOK_SECRET` (`app/api/routes/billing.py`). Idempotency table `processed_webhook_events` prevents replay. | If `STRIPE_WEBHOOK_SECRET` leaks, attacker can mint plan upgrades until rotated. |
| DNS / cookie scope confusion across `jobassist.tech` ↔ `*.railway.app` | Documented in `SAAS_HARDENING_CHANGES.md`. Same-site config (`api.jobassist.tech`) is the recommended durable fix. | Until DNS is moved, we rely on `SameSite=None; Secure` which the Safari ITP roadmap may further restrict. |

### Tampering

| Threat | Mitigation | Residual risk |
|---|---|---|
| Modifying another user's jobs / resumes / alerts | Every route filters by `current_user.id`; all FKs are `ON DELETE CASCADE` from `users`. Integration tests in `backend/tests/test_api_integration.py` assert cross-user isolation. | Future routes can regress this; add a cross-user negative test for every new endpoint. |
| SQL injection | SQLAlchemy 2.x parameterised queries everywhere; no raw `text(...)` with user input. | None significant. Static review on PR is sufficient. |
| Tampering with refresh token in transit | `Secure` cookie + HTTPS-only (`COOKIE_SECURE=true` in prod). | None on the wire. |
| Tampering with file upload (malicious resume) | Resumes are parsed but never executed; `raw_text` only fed to the LLM. PDF parser is `pypdf` (no JS exec). | A future "preview as HTML" feature would re-introduce XSS via uploaded content. Re-review then. |

### Repudiation

| Threat | Mitigation | Residual risk |
|---|---|---|
| User denies billing action | Stripe is the source of truth (their dashboard has full audit); our `subscriptions` table mirrors it. Webhook events are persisted with `processed_webhook_events`. | None significant. |
| Admin disputes a destructive action | Admin endpoint logs `client_ip`, user-agent, target user, outcome. | Log retention is whatever the hosting provider gives by default — define a retention policy before B2B sales. |
| User denies running an AI action that consumed quota | Per-request usage rows in `usage` table with timestamp and feature; Sentry captures the request_id. | Quota consumption is on a best-effort basis if Groq returns mid-stream errors; flagged on `/health/dependencies`. |

### Information disclosure

| Threat | Mitigation | Residual risk |
|---|---|---|
| Refresh-token theft via XSS | Refresh token is HttpOnly cookie. Access token lives in `localStorage` (necessary for cross-tab sync), so XSS = full session compromise for ≤ 30 min until refresh fails on the missing cookie origin. | Mitigate by keeping CSP tight (still TODO — see §3). Never embed user-supplied HTML. |
| Direct DB dump | DB lives on Render with managed backups + at-rest encryption. Admin access is gated by Render org SSO. | Render IAM changes need a quarterly audit. |
| Logs containing PII | Structured logging filters `password`, `token`, `secret` keys; request bodies are not logged. | New code can still log user input; review at PR time. |
| Avatar exposure via predictable URL | Avatars are stored as base64 inside the user's profile row (no public URL). | Eats DB rows; consider migrating to object storage with signed URLs if avatars become large or shared. |
| 3rd-party data sharing (Groq, Adzuna, Stripe) | Documented in `PRIVACY_POLICY.md` § "Subprocessors". | Each new subprocessor needs a contract review + privacy-policy update. |
| Email enumeration on `/auth/register` and `/auth/forgot-password` | Both endpoints return uniform "check your email" responses; no leak of whether the address is registered. | None significant. |

### Denial of service

| Threat | Mitigation | Residual risk |
|---|---|---|
| Brute-force login | `slowapi` `Limiter` on `/auth/login`. Failed attempts return 401 + delayed response. | Distributed credential-stuffing attack can still saturate; rely on Render's edge. |
| Resource exhaustion via AI endpoints | Per-feature daily quotas enforced at request time (`app/services/usage_service.py`). Per-request timeout `TIMEOUT_AI_MS=90s` on the client; backend timeouts on the Groq SDK. | A single user on the Max plan can still burn Groq budget — set per-plan upstream limits in Groq dashboard. |
| Job-create flood | `MAX_JOBS_PER_USER = 500` enforced in `create_job`; surfaced as a 403 with structured payload. | None significant. |
| Adzuna upstream meltdown | Adzuna client wraps a circuit breaker; failures return `{"jobs": [], "error": ...}` instead of cascading 500s (`app/services/job_search.py`). | If circuit stays open, scheduled alerts produce empty results — surfaced on `/health/dependencies?deep=true`. |
| Scheduler thunder (multi-worker) | Postgres advisory locks (`app/core/advisory_lock.py`) wrap every scheduled job so only one worker runs each tick. | Cron expressions are still in code; a misconfigured cron will hit DB harder than expected. |
| Webhook spam | Stripe signature check rejects anything else; idempotency table prevents replay; no public webhook endpoint outside Stripe. | None significant. |

### Elevation of privilege

| Threat | Mitigation | Residual risk |
|---|---|---|
| Regular user accessing admin endpoint | `/admin/*` requires `ADMIN_SECRET` header (independent from user auth). | Anyone with `ADMIN_SECRET` can act. Rotate on any team change. |
| Privilege via plan downgrade race | Stripe webhook is the only path that mutates `subscriptions.plan`. Race on customer creation closed via `IntegrityError` retry (`app/api/routes/billing.py`). | None significant. |
| JWT algorithm confusion | `jwt.decode(token, key, algorithms=["HS256"])` — algorithm is pinned. | None significant unless we add another signer. |
| Path traversal on resume download | We never serve resumes by filename; the API returns parsed JSON only, by user-scoped ID. | If a "download original" feature is ever added, use opaque IDs + Content-Disposition. |

---

## 3. Known open items

These are not actively exploited, but they sit on the security backlog and
should be addressed in priority order:

1. **Content Security Policy** — no `Content-Security-Policy` header is
   set by the backend or by Vercel. With access tokens in `localStorage`,
   a single XSS = full session compromise. Adopt a strict
   `script-src 'self'; object-src 'none'; base-uri 'none'` once the SPA
   build stops requiring inline scripts.
2. **Subresource Integrity** for any third-party CDN scripts. None today,
   but Stripe.js loaded from `js.stripe.com` should pin a SRI hash.
3. **SECURITY.md disclosure policy** — publish a contact + GPG key.
4. **Per-tenant key derivation for resume text** — currently encrypted only
   at rest by the DB. Field-level encryption (envelope encryption with a
   per-user key) is the natural next step for enterprise customers.
5. **Audit log retention policy** — agreed and documented (e.g. 365 days
   hot, 7 years cold). Today retention is implicit.
6. **2FA / WebAuthn** — not implemented. Stripe already enforces 2FA on
   the billing side; user login does not.

---

## 4. Incident response — at-a-glance

If you suspect a live incident:

1. Capture `request_id` from logs / Sentry. Cross-reference structured
   logs (`backend` service on Render).
2. If credential / session compromise is suspected: rotate `SECRET_KEY`
   in Render env. This invalidates **every** access token within
   `ACCESS_TOKEN_EXPIRE_MINUTES` (30 min) and every refresh token
   immediately. Communicate the forced logout before flipping.
3. If `ADMIN_SECRET` is suspected leaked: rotate via Render env. Audit
   the structured log for `admin` events in the previous 30 days.
4. If `STRIPE_WEBHOOK_SECRET` is suspected leaked: rotate in Stripe
   dashboard → "Developers → Webhooks" → endpoint → "Reveal signing
   secret" → "Roll secret". Update Render env. Confirm a real webhook
   replay (Stripe dashboard → "Send test webhook") still works.
5. File a post-mortem in `docs/incidents/YYYY-MM-DD-<slug>.md` (folder
   created on demand — first incident also creates the README).

---

## 5. Change log

| Date | Change |
|---|---|
| 2026-05-14 | Initial version. STRIDE table calibrated against the codebase as of the `SAAS_HARDENING_CHANGES.md` rev. |
