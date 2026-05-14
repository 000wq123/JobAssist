#!/usr/bin/env bash
# One-shot repo cleanup. Run from the repository root.
# Removes the cruft + deprecated migration scripts that were stubbed out
# during the SaaS-hardening pass. Safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Removing leftover dev cruft from the repo root"
# Note: vercel.json is INTENTIONALLY kept — it's the live Vercel build config
# (sets outputDirectory=frontend/dist). Delete it manually only if you've
# moved off Vercel.
rm -f \
  get.pip.py \
  sse3_temp.txt \
  package.json \
  package-lock.json

echo "==> Removing leftover dev cruft from frontend/"
rm -f \
  frontend/lint_out.txt \
  frontend/lint_result.txt \
  frontend/netlify.toml

echo "==> Removing deprecated backend migration scripts (replaced by Alembic)"
rm -f \
  backend/migrate.py \
  backend/migrate_austrian.py \
  backend/migrate_deadline.py \
  backend/migrate_fingerprint.py \
  backend/migrate_notes.py \
  backend/migrate_phase3.py \
  backend/migrate_research.py \
  backend/migrate_url.py \
  backend/run_migration_004.py \
  backend/run_migration_005.py \
  backend/run_migration_006.py \
  backend/run_migration_007.py \
  backend/run_migration_008.py \
  backend/run_migrations.sh \
  backend/run_sql.py

echo "==> Archiving the legacy SQL migrations under backend/migrations/legacy/"
if [ -d backend/migrations ] && [ ! -d backend/migrations/legacy ]; then
  mkdir -p backend/migrations/legacy
  # Keep them in git as historical reference, just out of the way.
  mv backend/migrations/*.sql backend/migrations/legacy/ 2>/dev/null || true
fi

echo "==> Tidy startup_migrations now that it's a no-op"
# Optional: delete the deprecated module if no in-tree imports remain.
if ! grep -rq --include='*.py' 'startup_migrations' backend/ 2>/dev/null; then
  rm -f backend/app/core/startup_migrations.py
  echo "  -> removed (no remaining imports)"
else
  echo "  -> kept (still imported somewhere; remove the import then re-run)"
fi

echo "==> Moving root-level dev guides into docs/guides/"
mkdir -p docs/guides
# Plain `mv` because `git mv -k` silently fails when the file is untracked,
# and at least some of these guides aren't in the index. Any subsequent
# `git add -A` will detect the renames via content similarity.
for guide in \
  AUTHENTICATION_FIXES.md \
  AUTH_DEBUG_GUIDE.md \
  CHECK_TABLES.md \
  FEATURES_SUMMARY.md \
  IMPLEMENTATION_GUIDE.md \
  LOGIN_TROUBLESHOOTING.md \
  MIGRATION_GUIDE.md \
  QUICK_START.md \
  RESUME_GENERATOR_SETUP.md \
  SETUP.md \
  TESTING_CHECKLIST.md \
  TROUBLESHOOTING.md \
  WINDOWS_SETUP.md \
  cv-builder-prompt.md; do
  if [ -f "$guide" ]; then
    mv "$guide" docs/guides/
  fi
done

echo
echo "Done. Review with:    git status"
echo "Then commit with:    git add -A && git commit -m \"chore: repo cleanup + alembic migration\""
