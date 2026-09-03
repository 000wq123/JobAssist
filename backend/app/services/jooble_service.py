"""Jooble job search client.

Jooble is a job aggregator that indexes karriere.at, stepstone.at, and other
Austrian sources. It provides a free API tier (up to 500 requests/day).

Docs: https://jooble.org/api/docs
"""
from __future__ import annotations

import logging
import re
import time
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core import metrics
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Cache ────────────────────────────────────────────────────────────────────
# Same strategy as Adzuna: in-process LRU with short TTL.
_CACHE_TTL_S = 300.0
_CACHE_MAX = 256
_cache: "OrderedDict[tuple, tuple[float, dict]]" = OrderedDict()

_JOOBLE_BASE = "https://jooble.org/api"


def _cache_key(keywords: Optional[str], location: Optional[str], page: int) -> tuple:
    return (
        (keywords or "").strip().lower(),
        (location or "").strip().lower(),
        int(page),
    )


def _cache_get(key: tuple) -> Optional[dict]:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL_S:
        _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return value


def _cache_set(key: tuple, value: dict) -> None:
    _cache[key] = (time.monotonic(), value)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


def clear_jooble_cache() -> int:
    n = len(_cache)
    _cache.clear()
    return n


def get_jooble_provider_status() -> dict:
    return {
        "configured": bool(settings.JOOBLE_API_KEY),
    }


# ── Normalisation helpers ───────────────────────────────────────────────────

def _strip_tags(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_date(raw: str | None) -> Optional[datetime]:
    if not raw:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ── Search ───────────────────────────────────────────────────────────────────

async def search_jooble(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    use_cache: bool = True,
) -> dict:
    """Search jobs via Jooble API.

    Returns the same schema as ``search_jobs`` (Adzuna) so callers can treat
    both providers interchangeably.
    """
    api_key = settings.JOOBLE_API_KEY
    if not api_key:
        logger.error("JOOBLE_API_KEY not set")
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jooble API-Schlüssel nicht konfiguriert. Bitte in .env eintragen.",
        }

    cache_key = _cache_key(keywords, location, page)
    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            metrics.inc("jobassist_jooble_cache_total", labels={"outcome": "hit"})
            return cached
        metrics.inc("jobassist_jooble_cache_total", labels={"outcome": "miss"})

    # Jooble's location field expects country-level names and returns global
    # results when empty — scope to Austria by default (this is an Austrian app).
    # City names ("Wien") return 0 hits; the country scope is more useful.
    jooble_location = (location or "").strip()
    if not jooble_location or jooble_location.lower() in ("wien", "vienna", "österreich", "austria"):
        jooble_location = "Austria"

    # Jooble uses 1-based page numbers and 20 results per page by default
    body = {
        "keywords": keywords or "",
        "location": jooble_location,
        "page": str(page),
    }

    url = f"{_JOOBLE_BASE}/{api_key}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(url, json=body)
            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError as e:
        logger.error(
            "Jooble HTTP error",
            extra={"status_code": e.response.status_code, "body": e.response.text[:300]},
        )
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jooble-Suche vorübergehend nicht verfügbar. Bitte in einer Minute erneut versuchen.",
        }
    except Exception as e:
        logger.error("Jooble error", extra={"error_type": type(e).__name__, "error": str(e)})
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jooble-Suche vorübergehend nicht verfügbar. Bitte in einer Minute erneut versuchen.",
        }

    jobs = data.get("jobs", [])
    total_count = data.get("totalCount", len(jobs))

    # Filter out stale listings (>60 days) — same policy as Adzuna
    cutoff = datetime.now(timezone.utc) - timedelta(days=60)
    stale_before = len(jobs)

    def _fresh_enough(j: dict) -> bool:
        updated = j.get("updated")
        if not updated:
            return True
        d = _parse_date(updated)
        return d is None or d >= cutoff

    jobs = [j for j in jobs if _fresh_enough(j)]
    if len(jobs) < stale_before:
        logger.info("Jooble: filtered %d stale jobs (>60 days)", stale_before - len(jobs))

    logger.info("Jooble: %d jobs (keywords=%r, location=%r)", len(jobs), keywords, location)

    # Normalise to Adzuna-equivalent schema
    from app.services.job_search import _find_contact_email, _format_salary as _fmt_salary

    result = {
        "jobs": [
            {
                "title": j.get("title", ""),
                "company": j.get("company", ""),
                "location": j.get("location", ""),
                "description": _strip_tags(j.get("snippet", "")),
                "full_url": j.get("link", ""),
                "salary": _fmt_salary({
                    "salary_min": _extract_salary_min(j.get("salary", "")),
                    "salary_max": _extract_salary_max(j.get("salary", "")),
                }),
                "source": j.get("source", "Jooble"),
                "source_id": str(j.get("id", "")),
                "updated": j.get("updated", ""),
                "contact_email": _find_contact_email(j.get("company", ""), ""),
            }
            for j in jobs
        ],
        "total_count": total_count,
        "page": page,
    }

    if use_cache and result["jobs"]:
        _cache_set(cache_key, result)
    return result


# ── Helpers ──────────────────────────────────────────────────────────────────


def _extract_salary_min(raw: str | None) -> float | None:
    if not raw:
        return None
    # Match patterns like "€2500", "€ 2 500 - 3 000", "2000-3000"
    nums = [float(n.replace(" ", "").replace(",", "")) for n in re.findall(r"[\d\s,]+", raw) if n.strip()]
    return nums[0] if nums else None


def _extract_salary_max(raw: str | None) -> float | None:
    if not raw:
        return None
    nums = [float(n.replace(" ", "").replace(",", "")) for n in re.findall(r"[\d\s,]+", raw) if n.strip()]
    return nums[-1] if len(nums) > 1 else None
