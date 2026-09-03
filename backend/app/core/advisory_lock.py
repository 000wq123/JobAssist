"""Cross-process scheduler coordination via PostgreSQL advisory locks.

Railway runs the backend with `--workers 2` (and could scale higher), which
means the FastAPI lifespan starts the scheduler loops once **per worker**.
Without coordination, daily resets and stale-user cleanup would run twice;
job-alert dispatch is also protected by an atomic row lease, but the helpers below let us
guarantee at-most-once execution for non-row-level work as well.

On SQLite (used by tests) advisory locks don't exist; the helpers degrade
to a no-op so test suites still pass.

Usage:
    async with try_advisory_lock("daily_reset") as acquired:
        if not acquired:
            return  # another worker is already running this
        ...
"""
from __future__ import annotations

import contextlib
import hashlib
import logging
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine

logger = logging.getLogger(__name__)


def _key_to_int(name: str) -> int:
    """Deterministically map an arbitrary string to a signed 64-bit int.

    Postgres `pg_try_advisory_lock(bigint)` requires a signed int8;
    we hash and mask to fit while keeping the value stable across processes.
    """
    digest = hashlib.blake2b(name.encode("utf-8"), digest_size=8).digest()
    n = int.from_bytes(digest, "big", signed=False)
    # Convert to signed 64-bit range
    if n >= 1 << 63:
        n -= 1 << 64
    return n


@contextlib.asynccontextmanager
async def try_advisory_lock(name: str) -> AsyncIterator[bool]:
    """Try to acquire a Postgres session-level advisory lock.

    Yields True if acquired (and the caller should do the work), False otherwise.
    The lock is released automatically when the underlying session closes.

    On non-Postgres dialects this acts as a no-op that always yields True —
    matching the previous single-worker behaviour for local SQLite tests.
    """
    if engine.dialect.name != "postgresql":
        yield True
        return

    key = _key_to_int(name)
    session: AsyncSession = AsyncSessionLocal()
    try:
        result = await session.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key})
        acquired = bool(result.scalar())
        if not acquired:
            logger.info("advisory_lock.skipped", extra={"lock": name})
            yield False
            return
        try:
            yield True
        finally:
            try:
                await session.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
            except Exception:
                # Session close will release session-scoped locks anyway.
                logger.exception("advisory_lock.unlock_failed", extra={"lock": name})
    finally:
        await session.close()
