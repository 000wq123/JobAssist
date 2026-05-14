# JobAssist — Documentation Index

This folder is the single landing page for every long-form document in the
repo. If you are looking for "how do I…" or "what is…", start here.

> **Agent / contributor rules** live at the repo root:
> `AGENTS.md`, `CLAUDE.md`. Those files intentionally stay out of `docs/`
> because automation tooling expects to find them at the root.

## Top-level docs (this folder)

| File | When to read it |
|---|---|
| `DEPLOYMENT_CHECKLIST.md` | Before every production deploy. Env vars, smoke tests, rollback. |
| `OPERATIONS_RUNBOOK.md`   | During an incident. Health endpoints, common failure modes, deploy verification. |
| `SAAS_HARDENING_CHANGES.md` | The 2026-05-10 hardening change-log. Treat as a historical reference. |
| `SECURITY_THREAT_MODEL.md` | When changing auth, payments, or any path that touches user data. STRIDE walkthrough + mitigations. |
| `PRIVACY_POLICY.md`       | Customer-facing privacy notice template (GDPR-aware). Edit the placeholders before publishing. |
| `DPA_TEMPLATE.md`         | Data Processing Agreement template for B2B customers / data subjects. |

## `guides/` — historical setup & troubleshooting notes

These were the loose `*.md` files that used to live at the repo root before
the 2026-05 consolidation. They are kept for searchability but most are
superseded by `DEPLOYMENT_CHECKLIST.md` / `OPERATIONS_RUNBOOK.md`.

| File | Topic |
|---|---|
| `QUICK_START.md`             | First-time local setup. |
| `SETUP.md`                   | Detailed install / config (Linux + macOS). |
| `WINDOWS_SETUP.md`           | Windows-specific setup notes. |
| `IMPLEMENTATION_GUIDE.md`    | Big-picture architecture walkthrough. |
| `FEATURES_SUMMARY.md`        | High-level product feature list. |
| `MIGRATION_GUIDE.md`         | Historical DB migrations. **Note:** schema is now Alembic-owned (see `backend/alembic/README.md`). |
| `CHECK_TABLES.md`            | DB sanity-check queries. |
| `AUTHENTICATION_FIXES.md`    | Audit notes from the 2026-05 auth rework (refresh-token httpOnly cookie migration). |
| `AUTH_DEBUG_GUIDE.md`        | How to debug auth/session issues end-to-end. |
| `LOGIN_TROUBLESHOOTING.md`   | User-facing login problems and resolutions. |
| `TROUBLESHOOTING.md`         | General troubleshooting catch-all. |
| `TESTING_CHECKLIST.md`       | Manual QA pass before a release. |
| `RESUME_GENERATOR_SETUP.md`  | Wiring the resume-generator feature. |
| `cv-builder-prompt.md`       | LLM prompt used by the CV builder. |

## Repo-wide rules & memory

These live outside `docs/` on purpose — tooling looks for them at fixed
paths:

- `/AGENTS.md` — coding rules every contributor (human + AI) must follow.
- `/CLAUDE.md` — Claude-specific operating instructions.
- `/memory/MEMORY.md`, `/memory/project_overview.md` — long-running session
  notes used by agents.

## Per-subsystem READMEs

Some folders carry their own focused README — read that first if you're
working in the area:

- `backend/alembic/README.md` — bootstrap + day-to-day migration workflow
  (this is the canonical schema lifecycle now; the `MIGRATION_GUIDE.md`
  in `guides/` is historical).

## Adding new docs

- Customer-facing or compliance docs go in `docs/` directly.
- Internal how-to / troubleshooting goes in `docs/guides/`.
- One subsystem's deep-dive should live next to its code (e.g. an
  `alembic/README.md`), not in `docs/`.
- Update this index when you add a file. Indexes that lie are worse than
  no index at all.
