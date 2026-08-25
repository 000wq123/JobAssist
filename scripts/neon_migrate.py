#!/usr/bin/env python3
"""
Neon us-east-1 -> Frankfurt migration using pure Python (asyncpg).
Generates a SQL dump of schema + data from source, applies to target.

Usage:
  NEW_URL="postgresql://..." python3 neon_migrate.py
"""
import asyncio
import os
import sys

sys.path.insert(0, "/home/davorrr/Documents/JobAssist-main/backend")
os.chdir("/home/davorrr/Documents/JobAssist-main/backend")

from dotenv import load_dotenv
load_dotenv("/home/davorrr/Documents/JobAssist-main/backend/.env", override=True)

import asyncpg

SRC = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://").split("?")[0]
NEW = os.environ.get("NEW_URL", "").replace("postgresql+asyncpg://", "postgresql://").split("?")[0]

DRY_RUN = "--dump-only" in sys.argv

if not NEW and not DRY_RUN:
    print("ERROR: set NEW_URL env var to the Frankfurt connection string")
    print("       or run with --dump-only to just dump the source DB.")
    sys.exit(1)

def q(s):
    return "'" + s.replace("'", "''") + "'" if s is not None else "NULL"

async def main():
    if DRY_RUN:
        src = await asyncpg.connect(SRC, ssl="require")
    else:
        src = await asyncpg.connect(SRC, ssl="require")
        tgt = await asyncpg.connect(NEW, ssl="require")

    # 1. Get table list in dependency-safe order is hard; use --column-inserts style
    #    with schema recreated via information_schema reflection.
    tables = [r["tablename"] for r in await src.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )]
    print(f"tables: {len(tables)}")

    stmts = []
    stmts.append("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")

    for t in tables:
        cols = await src.fetch(
            """SELECT column_name, data_type, is_nullable, column_default,
                      character_maximum_length, numeric_precision, numeric_scale
               FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position""", t)
        col_defs = []
        col_names = []
        for c in cols:
            typ = c["data_type"]
            if typ == "character varying":
                typ = f"varchar({c['character_maximum_length'] or 255})"
            elif typ == "numeric":
                p, s = c["numeric_precision"], c["numeric_scale"]
                typ = f"numeric({p},{s})" if p else "numeric"
            null_sql = "" if c["is_nullable"] == "YES" else " NOT NULL"
            default = f" DEFAULT {c['column_default']}" if c["column_default"] else ""
            col_defs.append(f'  "{c["column_name"]}" {typ}{null_sql}{default}')
            col_names.append(c["column_name"])
        ddl = 'CREATE TABLE "' + t + '" (\n' + ",\n".join(col_defs) + "\n);"
        stmts.append(ddl)

        # data
        rows = await src.fetch(f'SELECT * FROM "{t}"')
        if rows:
            collist = ",".join(f'"{c}"' for c in col_names)
            chunk = 200
            for i in range(0, len(rows), chunk):
                vals = []
                for row in rows[i:i+chunk]:
                    rowvals = []
                    for c in col_names:
                        v = row[c]
                        if v is None:
                            rowvals.append("NULL")
                        elif isinstance(v, bool):
                            rowvals.append("TRUE" if v else "FALSE")
                        elif isinstance(v, (int, float)):
                            rowvals.append(str(v))
                        else:
                            rowvals.append(q(str(v)))
                    vals.append("(" + ",".join(rowvals) + ")")
                stmts.append('INSERT INTO "' + t + '" (' + collist + ') VALUES ' + ",".join(vals) + ";")
        n = len(rows)
        if n: print(f"  {t}: {n} rows")

    # sequences: reset each serial sequence to max(id)
    for t in tables:
        try:
            seq = await tgt.fetchval("SELECT pg_get_serial_sequence($1, 'id')", t)
            if seq:
                await tgt.execute(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM \"{t}\"), 1))")
        except Exception:
            pass

    await src.close()

    if DRY_RUN:
        with open("/tmp/neon_dump.sql", "w") as f:
            f.write("\n".join(stmts))
        print(f"\nDump written to /tmp/neon_dump.sql ({len(stmts)} statements)")
        return

    for s in stmts:
        try:
            await tgt.execute(s)
        except Exception as e:
            msg = str(e).split("\n")[0][:150]
            if "already exists" in msg or "duplicate key" in msg:
                continue
            print(f"  !! {msg}")

    for t in tables:
        try:
            seq = await tgt.fetchval("SELECT pg_get_serial_sequence($1, 'id')", t)
            if seq:
                await tgt.execute('SELECT setval(\'' + seq + '\', COALESCE((SELECT MAX(id) FROM "' + t + '"), 1))')
        except Exception:
            pass

    # Create missing id sequences + attach defaults (schema reflection doesn't
    # carry serial/identity defaults, so tables would otherwise have no auto-id).
    repair_rows = await tgt.fetch("""
        SELECT t.table_name FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
            AND c.column_name = 'id' AND c.column_default IS NULL
        WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
          AND c.data_type IN ('integer','bigint')
    """)
    for r in repair_rows:
        t = r["table_name"]
        try:
            await tgt.execute('CREATE SEQUENCE IF NOT EXISTS "' + t + '_id_seq" OWNED BY "' + t + '"."id"')
            await tgt.execute('SELECT setval(\'' + t + '_id_seq\', COALESCE((SELECT MAX(id) FROM "' + t + '"), 1))')
            await tgt.execute('ALTER TABLE "' + t + '" ALTER COLUMN id SET DEFAULT nextval(\'' + t + '_id_seq\')')
            print(f"  seq fixed: {t}")
        except Exception as e:
            print(f"  seq !! {t}: {str(e)[:100]}")

    v = await tgt.fetchval("SELECT version_num FROM alembic_version")
    print(f"\nalembic head: {v}")
    await tgt.close()
    print("\nDONE. Update DATABASE_URL in backend/.env + hosting provider, then redeploy.")

asyncio.run(main())
