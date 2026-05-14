"""Retry helper for transient database errors.

Wraps a callable in an exponential-backoff retry loop, triggered on:
  * `sqlalchemy.exc.OperationalError` (connection lost, server gone, deadlock)
  * `sqlalchemy.exc.DBAPIError` where `connection_invalidated` is True
  * `asyncpg.exceptions.SerializationError` (40001 — serialization failure)
  * `asyncpg.exceptions.DeadlockDetectedError` (40P01)

Use sparingly — most code paths should fail fast and let the caller retry.
This helper exists for the narrow class of safely-idempotent operations
(e.g. claiming a scheduler tick, rotating a refresh token) where a brief
transient failure is normal and worth absorbing transparently.

Example::

    @retry_on_transient_db_error()
    async def claim_next_alert(...): ...
"""
from __future__ import annotations

import asyncio
import functools
import logging
import random
from typing import Any, Awaitable, Callable, TypeVar

from sqlalchemy.exc import DBAPIError, OperationalError

from app.core import metrics

logger = logging.getLogger(__name__)

T = TypeVar("T")


def _is_transient(exc: BaseException) -> bool:
    """Return True if `exc` looks like a transient DB error worth retrying."""
    # Connection lost / server gone / deadlock at the SQLAlchemy layer.
    if isinstance(exc, OperationalError):
        return True
    if isinstance(exc, DBAPIError) and getattr(exc, "connection_invalidated", False):
        return True

    # asyncpg-level codes (postgres SQLSTATE) when surfaced as `.orig`.
    orig = getattr(exc, "orig", None)
    code = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None)
    if code in {"40001", "40P01"}:  # serialization_failure, deadlock_detected
        return True

    return False


def retry_on_transient_db_error(
    *,
    max_attempts: int = 3,
    initial_delay_s: float = 0.1,
    max_delay_s: float = 1.5,
) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Decorator that retries the wrapped async fn on transient DB errors.

    Backoff: `initial_delay_s * 2**attempt`, capped at `max_delay_s`, with
    20 % jitter so concurrent retriers don't dogpile.
    """

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            attempt = 0
            while True:
                try:
                    return await fn(*args, **kwargs)
                except BaseException as exc:  # noqa: BLE001 — narrowed below
                    if not _is_transient(exc) or attempt >= max_attempts - 1:
                        if _is_transient(exc):
                            metrics.inc(
                                "jobassist_db_errors_total",
                                labels={"kind": type(exc).__name__, "outcome": "exhausted"},
                            )
                        raise
                    metrics.inc(
                        "jobassist_db_errors_total",
                        labels={"kind": type(exc).__name__, "outcome": "retried"},
                    )
                    delay = min(initial_delay_s * (2**attempt), max_delay_s)
                    delay = delay * (1 + random.uniform(-0.2, 0.2))
                    logger.warning(
                        "db.transient_retry",
                        extra={
                            "fn": fn.__name__,
                            "attempt": attempt + 1,
                            "max_attempts": max_attempts,
                            "delay_s": round(delay, 3),
                            "error": type(exc).__name__,
                        },
                    )
                    await asyncio.sleep(delay)
                    attempt += 1

        return wrapper

    return decorator


__all__ = ["retry_on_transient_db_error"]
