#!/usr/bin/env python3
"""One-shot repair: create missing id sequences and attach them as defaults."""
import asyncio
import os
import sys

sys.path.insert(0, "/home/davorrr/Documents/JobAssist-main/backend")
os.chdir("/home/davorrr/Documents/JobAssist-main/backend")

from dotenv import load_dotenv
load_dotenv(".env", override=False)

NEW = os.environ.get(
    "NEW_URL",
    os.environ.get("DATABASE_URL", "")
).replace("postgresql+asyncpg://", "postgresql://").split("?")[0]

if not NEW or "localhost" in NEW:
    print("Set NEW_URL to the Frankfurt connection string")
    sys.exit(1)

import asyncpg


async def main():
    conn = await asyncpg.connect(NEW, ssl="require")

    rows = await conn.fetch("""
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
            AND c.table_schema = t.table_schema
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          AND c.column_name = 'id'
          AND c.column_default IS NULL
          AND c.data_type IN ('integer', 'bigint')
    """)
    print(f"tables needing sequence repair: {len(rows)}")

    for r in rows:
        t = r["table_name"]
        seq = f"{t}_id_seq"
        try:
            await conn.execute(f'CREATE SEQUENCE IF NOT EXISTS "{seq}" OWNED BY "{t}"."id"')
            await conn.execute(
                f'SELECT setval(\'"{seq}"\', COALESCE((SELECT MAX(id) FROM "{t}"), 1))'
            )
            await conn.execute(
                f'ALTER TABLE "{t}" ALTER COLUMN id SET DEFAULT nextval(\'"{seq}"\')'
            )
            print(f"  fixed: {t}")
        except Exception as e:
            print(f"  !! {t}: {str(e)[:120]}")

    await conn.close()
    print("repair complete")


asyncio.run(main())
