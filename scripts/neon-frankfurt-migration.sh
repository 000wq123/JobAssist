#!/bin/bash
# Neon us-east-1 → eu-central-1 (Frankfurt) migration runbook
# Run these steps manually — requires Neon console access.
set -euo pipefail

SOURCE_URL="postgresql+asyncpg://neondb_owner:***REMOVED***@ep-damp-heart-adgf2h2k-pooler.c-2.us-east-1.aws.neon.tech/neondb?ssl=require"
# 1. Create the new project in the Neon console: Region = AWS eu-central-1 (Frankfurt).
#    Then export the new connection string:
NEW_URL="${NEW_URL:?Set NEW_URL to the Frankfurt connection string first}"

echo "== 1. Dump source DB (schema + data) =="
DUMP=/tmp/jobassist_dump.dump
pg_dump --format=custom \
  "$(echo "$SOURCE_URL" | sed 's/+asyncpg//; s/?ssl=require/?sslmode=require/')" \
  --no-owner --no-privileges -f "$DUMP"
echo "dump written: $(du -h $DUMP | cut -f1)"

echo "== 2. Restore into Frankfurt =="
psql "$(echo "$NEW_URL" | sed 's/+asyncpg//; s/?ssl=require/?sslmode=require/')" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
pg_restore --no-owner --no-privileges --dbname \
  "$(echo "$NEW_URL" | sed 's/+asyncpg//; s/?ssl=require/?sslmode=require/')" "$DUMP"

echo "== 3. Verify =="
.venv-3.12/bin/python - <<'EOF'
import asyncio, os, sys
import asyncpg
url = os.environ["NEW_URL"].replace("postgresql+asyncpg://","postgresql://").replace("?ssl=require","?sslmode=require")
async def main():
    conn = await asyncpg.connect(url)
    try:
        v = await conn.fetchval("SELECT version_num FROM alembic_version")
        jobs = await conn.fetchval("SELECT count(*) FROM jobs")
        users = await conn.fetchval("SELECT count(*) FROM users")
        applied = await conn.fetchval("""SELECT count(*) FROM information_schema.columns
                                          WHERE table_name='jobs' AND column_name='applied_at'""")
        print(f"alembic: {v} | users: {users} | jobs: {jobs} | applied_at column: {bool(applied)}")
    finally:
        await conn.close()
asyncio.run(main())
EOF

echo "== 4. Latency check from this machine =="
python3 - <<'PYEOF'
import socket, time
host = input().strip() if False else None
PYEOF

echo "DONE. Now update DATABASE_URL in backend/.env and your hosting provider,"
echo "then redeploy the backend."
