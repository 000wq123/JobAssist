"""Shared utilities for job scrapers.

- In-process LRU cache (same TTL/strategy as Adzuna/Jooble)
- Rate-limiting semaphore (1 req / sec per domain)
- Browser-like HTTP headers
- Common normalisation helpers
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.core import metrics

logger = logging.getLogger(__name__)

# ── Cache ────────────────────────────────────────────────────────────────────
_CACHE_TTL_S = 300.0
_CACHE_MAX = 256
_cache: "OrderedDict[str, tuple[float, dict]]" = OrderedDict()


def _cache_key(domain: str, keywords: Optional[str], location: Optional[str], page: int) -> str:
    return f"{domain}:{(keywords or '').strip().lower()}:{(location or '').strip().lower()}:{page}"


def _cache_get(key: str) -> Optional[dict]:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL_S:
        _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return value


def _cache_set(key: str, value: dict) -> None:
    _cache[key] = (time.monotonic(), value)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


def clear_scraper_cache() -> int:
    n = len(_cache)
    _cache.clear()
    return n


# ── Rate limiting ───────────────────────────────────────────────────────────
# One semaphore per domain so we don't hammer any single site.
_domain_locks: dict[str, asyncio.Semaphore] = {}
_domain_last_req: dict[str, float] = {}

_MIN_DELAY_S = 1.0  # minimum seconds between requests to same domain


async def _rate_limited(domain: str) -> None:
    """Acquire per-domain rate limit. Ensures ≥1s between requests."""
    sem = _domain_locks.setdefault(domain, asyncio.Semaphore(1))
    async with sem:
        last = _domain_last_req.get(domain, 0.0)
        elapsed = time.monotonic() - last
        if elapsed < _MIN_DELAY_S:
            await asyncio.sleep(_MIN_DELAY_S - elapsed)
        _domain_last_req[domain] = time.monotonic()


# ── HTTP client ──────────────────────────────────────────────────────────────
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


async def _fetch_html(url: str, params: Optional[dict] = None) -> BeautifulSoup:
    """Fetch a URL and return parsed BeautifulSoup."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(url, params=params, headers=_HEADERS)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")


# ── Normalisation helpers ────────────────────────────────────────────────────

def _strip(text: Optional[str]) -> str:
    if not text:
        return ""
    return " ".join(text.split())


def _parse_eu_date(text: Optional[str]) -> Optional[datetime]:
    """Parse German/Austrian date strings to UTC datetime."""
    if not text:
        return None
    text = text.strip().lower()
    # Common patterns:
    # "01.06.2024", "1.6.2024", "01.06.2024", "1. Juni 2024", "vor 2 Tagen"
    for fmt in ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    # "vor X Tagen" -> today minus X days
    m = re.search(r"vor\s+(\d+)\s+tagen?", text)
    if m:
        return datetime.now(timezone.utc) - __import__("datetime").timedelta(days=int(m.group(1)))
    return None


def _extract_salary(text: Optional[str]) -> str:
    if not text:
        return ""
    # Patterns like "€ 2.500", "€2500", "ab € 2.500", "€ 2.500 - € 3.500"
    m = re.search(
        r"(ab\s+)?€\s*[\d.]+(?:\s*-\s*€?\s*[\d.]+)?", text, re.IGNORECASE
    )
    return m.group(0).replace(".", ",") if m else ""


def _extract_job_type(text: Optional[str]) -> str:
    if not text:
        return ""
    lowered = text.lower()
    mapping = {
        "vollzeit": "Vollzeit",
        "teilzeit": "Teilzeit",
        "praktikum": "Praktikum",
        "lehre": "Lehre",
        "ausbildung": "Lehre",
        "werkstudent": "Werkstudent",
        "werkstduent": "Werkstudent",
        "freelance": "Freiberuflich",
        "freiberuflich": "Freiberuflich",
        "selbstständig": "Freiberuflich",
        "minijob": "Geringfügig",
        "geringfügig": "Geringfügig",
        "aushilfe": "Geringfügig",
    }
    for key, val in mapping.items():
        if key in lowered:
            return val
    return ""


def _build_result(jobs: list[dict], page: int = 1) -> dict:
    """Wrap a list of scraped jobs in the standard response envelope."""
    return {
        "jobs": jobs,
        "total_count": len(jobs),
        "page": page,
    }


def _cached_search(
    domain: str,
    keywords: Optional[str],
    location: Optional[str],
    page: int,
    use_cache: bool,
) -> Optional[dict]:
    if not use_cache:
        return None
    key = _cache_key(domain, keywords, location, page)
    cached = _cache_get(key)
    if cached is not None:
        metrics.inc("jobassist_scraper_cache_total", labels={"domain": domain, "outcome": "hit"})
        return cached
    metrics.inc("jobassist_scraper_cache_total", labels={"domain": domain, "outcome": "miss"})
    return None


def _store_result(domain: str, keywords: Optional[str], location: Optional[str], page: int, result: dict) -> None:
    if result.get("jobs"):
        key = _cache_key(domain, keywords, location, page)
        _cache_set(key, result)
