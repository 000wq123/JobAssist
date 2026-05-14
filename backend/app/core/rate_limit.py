"""Shared SlowAPI limiter.

Lives in `app.core` so route modules don't have to import `app.main`,
which would create a circular import (main imports the routes).

The key function `get_user_id_or_ip` is defined in `app.core.security`
and re-exported here for convenience.

Note on `enabled`: when `DEBUG=true` (dev / CI / tests) we disable the
limiter so unit tests can call route handlers directly without
constructing a `starlette.Request`. The limiter is fully active in
production where `DEBUG=false`.
"""
from slowapi import Limiter

from app.core.config import settings
from app.core.security import get_user_id_or_ip


limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=["200/minute"],
    enabled=not settings.DEBUG,
)
