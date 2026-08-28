"""willhaben.at job scraper.

Willhaben is Austria's largest classifieds platform and has a significant
jobs section (especially for part-time, mini-jobs, and informal work).

The old scrape path (``/iad/jobs`` + HTML cards) is dead: the site moved to a
Next.js app at ``/jobs`` and results are server-rendered into the
``__NEXT_DATA__`` JSON blob, so we parse that instead of DOM selectors.

URL scheme (verified 2026-08):
    https://www.willhaben.at/jobs/suche/{keyword-slug}[-{location-slug}]?page=N
    detail: https://www.willhaben.at/jobs/job/{slugTitle}/{id}
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

from app.services.scrapers.base import (
    _build_result,
    _cached_search,
    _extract_job_type,
    _fetch_html,
    _rate_limited,
    _store_result,
    _strip,
)
from app.services.job_search import _find_contact_email

logger = logging.getLogger(__name__)

_DOMAIN = "willhaben.at"
_SEARCH_URL = "https://www.willhaben.at/jobs/suche"

_UMLAUT_MAP = {
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    "Ä": "ae", "Ö": "oe", "Ü": "ue",
}


def _slugify(text: str) -> str:
    """Normalise a keyword/location to willhaben's URL slug form.

    Lowercase, umlauts expanded (kaernten, oberoesterreich), non-word chars
    collapsed to single dashes.
    """
    out = []
    for ch in text:
        if ch in _UMLAUT_MAP:
            out.append(_UMLAUT_MAP[ch])
        elif ch.isalnum():
            out.append(ch.lower())
        else:
            out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return slug


def _parse_entry(entry: dict) -> Optional[dict]:
    """Map one ``__NEXT_DATA__`` job entry to the standard scraper schema."""
    entry_id = entry.get("id")
    title = _strip(entry.get("title") or "")
    slug_title = entry.get("slugTitle") or ""
    if not entry_id or not title:
        return None

    locations = entry.get("jobLocations") or []
    location = _strip(", ".join(l["name"] for l in locations if l.get("name")))

    company = (entry.get("company") or {}).get("title") or ""

    salary = entry.get("salary")
    timeframe = _strip(entry.get("salaryTimeFrame") or "")
    salary_text = ""
    if salary:
        salary_text = f"€ {salary:,}".replace(",", ".")
        if timeframe:
            salary_text += f" {timeframe}"

    modes = entry.get("employmentModes") or []
    job_type = _extract_job_type(" ".join(modes)) if modes else ""

    description = _strip(entry.get("description") or "")

    return {
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "full_url": f"https://www.willhaben.at/jobs/job/{slug_title}/{entry_id}",
        "salary": salary_text,
        "source": "willhaben.at",
        "source_id": str(entry_id),
        "updated": entry.get("firstPublishDate") or entry.get("creationDate") or "",
        "contact_email": _find_contact_email(company, ""),
        "job_type": job_type,
    }


def _extract_entries(soup) -> list[dict]:
    """Pull the job entries out of the __NEXT_DATA__ blob."""
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        return []
    try:
        data = json.loads(script.string)
        root = data["props"]["pageProps"]["jobsSearchResultRoot"]
        return root.get("data", {}).get("entries", [])
    except (KeyError, TypeError, ValueError) as e:
        logger.warning("willhaben.at: could not parse __NEXT_DATA__: %s", e)
        return []


async def search_willhaben(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    use_cache: bool = True,
) -> dict:
    """Search willhaben.at jobs and return normalized listings."""
    cached = _cached_search(_DOMAIN, keywords, location, page, use_cache)
    if cached:
        return cached

    # Location is part of the search URL path, not a query param.
    path = _slugify(keywords) if keywords else ""
    if location and path:
        path = f"{path}-{_slugify(location)}"
    if not path:
        path = "alle-jobs"
    url = f"{_SEARCH_URL}/{path}"

    try:
        await _rate_limited(_DOMAIN)
        soup = await _fetch_html(url, params={"page": page} if page > 1 else None)

        entries = _extract_entries(soup)
        jobs: list[dict] = []
        for entry in entries:
            parsed = _parse_entry(entry)
            if parsed and parsed.get("title") and parsed.get("full_url"):
                jobs.append(parsed)

        # De-duplicate by source_id in case the API repeats entries across pages.
        seen: set[str] = set()
        unique: list[dict] = []
        for job in jobs:
            if job["source_id"] in seen:
                continue
            seen.add(job["source_id"])
            unique.append(job)
        jobs = unique

        result = _build_result(jobs, page)
        logger.info("willhaben.at: %d jobs (keywords=%r, location=%r)", len(result["jobs"]), keywords, location)
        _store_result(_DOMAIN, keywords, location, page, result)
        return result

    except Exception as e:
        logger.error("willhaben.at scrape error: %s", e, exc_info=True)
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "willhaben.at ist vorübergehend nicht erreichbar. Bitte versuche es später erneut.",
        }
