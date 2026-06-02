"""jobs.ams.at (Arbeitsmarktservice) scraper.

AMS is Austria's public employment service. Its job portal is highly
structured and exposes server-rendered HTML with clear CSS classes.
This makes it one of the more stable scraping targets.
"""
from __future__ import annotations

import logging
import re as _re
from typing import Optional

from bs4 import BeautifulSoup

from app.services.scrapers.base import (
    _build_result,
    _cached_search,
    _extract_job_type,
    _extract_salary,
    _fetch_html,
    _parse_eu_date,
    _rate_limited,
    _store_result,
    _strip,
)
from app.services.job_search import _find_contact_email

logger = logging.getLogger(__name__)

_DOMAIN = "ams.at"
_SEARCH_URL = "https://jobs.ams.at/public/emails/jobs"


def _parse_item(row: BeautifulSoup) -> Optional[dict]:
    """Extract job data from an AMS search-result row."""
    # Title + link
    title_el = (
        row.select_one("a[href*='/public/emails/jobs/']")
        or row.select_one("h3 a")
        or row.select_one(".title a")
    )
    if not title_el:
        return None

    title = _strip(title_el.get_text())
    href = title_el.get("href", "")
    if href.startswith("/"):
        href = f"https://jobs.ams.at{href}"

    # AMS job ID from URL: /public/emails/jobs/12345678
    source_id = ""
    m = _re.search(r"/jobs/(\d+)", href)
    if m:
        source_id = m.group(1)

    # Company (Arbeitgeber)
    company_el = (
        row.select_one("[class*='employer']")
        or row.select_one("[class*='company']")
        or row.select_one(".employer")
    )
    company = _strip(company_el.get_text()) if company_el else ""

    # Location
    loc_el = (
        row.select_one("[class*='location']")
        or row.select_one("[class*='ort']")
        or row.select_one(".location")
    )
    location = _strip(loc_el.get_text()) if loc_el else ""

    # Description snippet
    desc_el = (
        row.select_one("[class*='description']")
        or row.select_one("[class*='beschreibung']")
        or row.select_one(".description")
        or row.select_one("p")
    )
    description = _strip(desc_el.get_text()) if desc_el else ""

    # Salary (AMS often lists "Entgelt" or "Verdienst")
    salary_text = _extract_salary(description) or ""
    if not salary_text:
        sal_el = row.select_one("[class*='salary']") or row.select_one("[class*='entgelt']")
        if sal_el:
            salary_text = _extract_salary(_strip(sal_el.get_text()))

    # Employment type
    type_el = (
        row.select_one("[class*='employment']")
        or row.select_one("[class*='anstellung']")
        or row.select_one(".employment-type")
    )
    job_type = _extract_job_type(_strip(type_el.get_text()) if type_el else "")

    # Date posted
    date_el = (
        row.select_one("[class*='date']")
        or row.select_one("time")
    )
    posted_at = None
    if date_el:
        datetime_attr = date_el.get("datetime", "")
        posted_at = _parse_eu_date(datetime_attr) or _parse_eu_date(_strip(date_el.get_text()))

    return {
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "full_url": href,
        "salary": salary_text,
        "source": "jobs.ams.at",
        "source_id": source_id,
        "updated": "",
        "contact_email": _find_contact_email(company, ""),
        "job_type": job_type,
        "posted_at": posted_at.isoformat() if posted_at else None,
    }


async def search_ams(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    use_cache: bool = True,
) -> dict:
    """Search jobs.ams.at and return normalized listings."""
    cached = _cached_search(_DOMAIN, keywords, location, page, use_cache)
    if cached:
        return cached

    # AMS uses query params: q=keywords, l=location, p=page
    params: dict = {"p": page}
    if keywords:
        params["q"] = keywords
    if location:
        params["l"] = location

    try:
        await _rate_limited(_DOMAIN)
        soup = await _fetch_html(_SEARCH_URL, params=params)

        # AMS results are typically in table rows or article/list items
        rows = (
            soup.select("article.job-result")
            or soup.select(".job-listing")
            or soup.select("[class*='job-result']")
            or soup.select(".result-item")
            or soup.select("tbody tr")
            or soup.select(".search-results > div")
        )

        if not rows:
            logger.warning("jobs.ams.at: no result rows found — selectors may be stale.")

        jobs: list[dict] = []
        for row in rows[:20]:
            parsed = _parse_item(row)
            if parsed and parsed.get("title") and parsed.get("source_id"):
                jobs.append(parsed)

        result = _build_result(jobs, page)
        logger.info("jobs.ams.at: %d jobs (keywords=%r, location=%r)", len(result["jobs"]), keywords, location)
        _store_result(_DOMAIN, keywords, location, page, result)
        return result

    except Exception as e:
        logger.error("jobs.ams.at scrape error: %s", e, exc_info=True)
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "jobs.ams.at ist vorübergehend nicht erreichbar. Bitte versuche es später erneut.",
        }
