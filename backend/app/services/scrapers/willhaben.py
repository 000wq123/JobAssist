"""willhaben.at job scraper.

Willhaben is Austria's largest classifieds platform and has a significant
jobs section (especially for part-time, mini-jobs, and informal work).
We scrape the "iad/jobs" search results.
"""
from __future__ import annotations

import logging
from typing import Optional

from bs4 import BeautifulSoup

from app.services.scrapers.base import (
    _build_result,
    _cached_search,
    _extract_job_type,
    _extract_salary,
    _fetch_html,
    _rate_limited,
    _store_result,
    _strip,
)
from app.services.job_search import _find_contact_email

logger = logging.getLogger(__name__)

_DOMAIN = "willhaben.at"
_SEARCH_URL = "https://www.willhaben.at/iad/jobs"


def _parse_item(card: BeautifulSoup) -> Optional[dict]:
    """Extract job data from a willhaben search-result card."""
    # Title + link
    title_el = (
        card.select_one("h3 a")
        or card.select_one("a[data-testid*='job-title']")
        or card.select_one(".Text-Box-Heading a")
        or card.select_one("a[href*='/iad/jobs/']")
    )
    if not title_el:
        return None

    title = _strip(title_el.get_text())
    href = title_el.get("href", "")
    if href.startswith("/"):
        href = f"https://www.willhaben.at{href}"

    # Company / advertiser
    company_el = (
        card.select_one("[data-testid*='company']")
        or card.select_one(".Text-Box-SubHeadline")
        or card.select_one(".SellerInfo")
    )
    company = _strip(company_el.get_text()) if company_el else ""

    # Location
    loc_el = (
        card.select_one("[data-testid*='location']")
        or card.select_one(".Text-Box-Area")
        or card.select_one("[class*='location']")
    )
    location = _strip(loc_el.get_text()) if loc_el else ""

    # Description snippet (often visible in results)
    desc_el = (
        card.select_one("[data-testid*='description']")
        or card.select_one(".Text-Box-Description")
        or card.select_one("p")
    )
    description = _strip(desc_el.get_text()) if desc_el else ""

    # Salary
    salary_text = _extract_salary(description) or _extract_salary(title)

    # Job type from tags/badges
    type_el = (
        card.select_one("[data-testid*='employment-type']")
        or card.select_one(".Badge")
        or card.select_one("[class*='badge']")
    )
    job_type = _extract_job_type(_strip(type_el.get_text()) if type_el else "")

    # Image / source_id from URL
    source_id = href.split("/")[-1].split("?")[0] if href else ""

    return {
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "full_url": href,
        "salary": salary_text,
        "source": "willhaben.at",
        "source_id": source_id,
        "updated": "",
        "contact_email": _find_contact_email(company, ""),
        "job_type": job_type,
    }


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

    params: dict = {"page": page}
    if keywords:
        params["keyword"] = keywords
    if location:
        params["location"] = location

    try:
        await _rate_limited(_DOMAIN)
        soup = await _fetch_html(_SEARCH_URL, params=params)

        # Willhaben uses React components; cards are typically in article or div wrappers
        cards = (
            soup.select("article")
            or soup.select("[data-testid*='result-item']")
            or soup.select(".Box")
            or soup.select(".SearchResult")
            or soup.select("[class*='result']")
        )

        if not cards:
            logger.warning(
                "willhaben.at: no job cards found — selectors may be stale."
            )

        jobs: list[dict] = []
        for card in cards[:20]:
            parsed = _parse_item(card)
            if parsed and parsed.get("title") and parsed.get("full_url"):
                # Filter out non-job results (willhaben mixes categories)
                if "/iad/jobs/" in parsed["full_url"]:
                    jobs.append(parsed)

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
