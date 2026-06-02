"""karriere.at job scraper.

Karriere is the largest Austrian job board. It serves server-rendered HTML
with JSON-LD structured data on detail pages. We scrape the search results
page first, then follow detail links to get full descriptions.

Because detail-page fetching is slow (N serial requests), we limit to the
first 10 results per search. This keeps latency under ~5 seconds.
"""
from __future__ import annotations

import json
import logging
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

_DOMAIN = "karriere.at"
_SEARCH_URL = "https://www.karriere.at/jobs"


def _parse_search_item(card: BeautifulSoup) -> Optional[dict]:
    """Extract minimal job data from a search-result card."""
    # Try multiple title selectors
    title_el = (
        card.select_one("h2 a")
        or card.select_one("a[data-gtm*='job-title']")
        or card.select_one(".m-jobs__title a")
        or card.select_one(".job__title a")
        or card.select_one("a[href*='/jobs/']")
    )
    if not title_el:
        return None

    title = _strip(title_el.get_text())
    href = title_el.get("href", "")
    if href.startswith("/"):
        href = f"https://www.karriere.at{href}"

    # Company
    company_el = (
        card.select_one(".m-jobs__company")
        or card.select_one(".job__company")
        or card.select_one("[data-gtm*='company']")
    )
    company = _strip(company_el.get_text()) if company_el else ""

    # Location
    loc_el = (
        card.select_one(".m-jobs__location")
        or card.select_one(".job__location")
        or card.select_one("[data-gtm*='location']")
    )
    location = _strip(loc_el.get_text()) if loc_el else ""

    # Salary (sometimes shown in search results)
    salary_el = (
        card.select_one(".m-jobs__salary")
        or card.select_one(".job__salary")
    )
    salary_text = _extract_salary(_strip(salary_el.get_text()) if salary_el else "")

    # Type / tags
    type_el = (
        card.select_one(".m-jobs__type")
        or card.select_one(".job__type")
        or card.select_one(".m-jobs__badge")
    )
    job_type = _extract_job_type(_strip(type_el.get_text()) if type_el else "")

    # Posted date
    date_el = (
        card.select_one(".m-jobs__date")
        or card.select_one(".job__date")
        or card.select_one("time")
    )
    posted_at = None
    if date_el:
        datetime_attr = date_el.get("datetime", "")
        posted_at = _parse_eu_date(datetime_attr) or _parse_eu_date(_strip(date_el.get_text()))

    return {
        "title": title,
        "company": company,
        "location": location,
        "description": "",  # populated from detail page
        "full_url": href,
        "salary": salary_text,
        "source": "karriere.at",
        "source_id": _extract_source_id(href),
        "updated": "",
        "contact_email": _find_contact_email(company, ""),
        "job_type": job_type,
        "posted_at": posted_at.isoformat() if posted_at else None,
    }


def _extract_source_id(url: str) -> str:
    """Extract a stable ID from a karriere.at job URL."""
    # URLs look like: https://www.karriere.at/jobs/1234567-software-developer
    import re as _re
    m = _re.search(r"/jobs/(\d+)-", url)
    return m.group(1) if m else url


async def _enrich_detail(job: dict) -> dict:
    """Fetch the detail page and extract description + salary if missing."""
    url = job.get("full_url", "")
    if not url:
        return job

    try:
        await _rate_limited(_DOMAIN)
        soup = await _fetch_html(url)

        # 1. JSON-LD structured data (most reliable)
        ld_scripts = soup.find_all("script", type="application/ld+json")
        for script in ld_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    desc = data.get("description", "")
                    if desc:
                        job["description"] = _strip(desc)
                    if not job.get("salary"):
                        val = data.get("baseSalary", {})
                        if val:
                            mins = val.get("value", {}).get("minValue", "")
                            maxs = val.get("value", {}).get("maxValue", "")
                            if mins and maxs:
                                job["salary"] = f"€ {mins:,} – {maxs:,}"
                            elif mins:
                                job["salary"] = f"ab € {mins:,}"
                    if not job.get("company"):
                        job["company"] = _strip(data.get("hiringOrganization", {}).get("name", ""))
                    if not job.get("location"):
                        loc = data.get("jobLocation", {}).get("address", {})
                        job["location"] = _strip(loc.get("addressLocality", ""))
                    date_val = data.get("datePosted", "")
                    if date_val and not job.get("posted_at"):
                        job["posted_at"] = date_val
                    break
            except (json.JSONDecodeError, AttributeError):
                continue

        # 2. Fallback: meta description or visible description blocks
        if not job.get("description"):
            desc_el = (
                soup.select_one("[data-gtm*='job-description']")
                or soup.select_one(".job-detail__description")
                or soup.select_one("[class*='description']")
            )
            if desc_el:
                job["description"] = _strip(desc_el.get_text())

        # 3. Fallback: meta tag
        if not job.get("description"):
            meta = soup.find("meta", attrs={"name": "description"})
            if meta:
                job["description"] = _strip(meta.get("content", ""))

    except Exception as e:
        logger.warning("karriere.at detail fetch failed: %s", e)

    return job


async def search_karriere(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    use_cache: bool = True,
) -> dict:
    """Search karriere.at and return normalized job listings."""
    cached = _cached_search(_DOMAIN, keywords, location, page, use_cache)
    if cached:
        return cached

    params: dict = {"page": page}
    if keywords:
        params["keywords"] = keywords
    if location:
        params["locations"] = location

    try:
        await _rate_limited(_DOMAIN)
        soup = await _fetch_html(_SEARCH_URL, params=params)

        # karriere.at search results are typically in <article> or <div> cards
        cards = (
            soup.select("article.m-jobs__item")
            or soup.select("[data-gtm*='job']")
            or soup.select(".job-listing")
            or soup.select(".m-jobs__list > div")
            or soup.select(".job")
        )

        if not cards:
            logger.warning(
                "karriere.at: no job cards found — selectors may be stale. "
                "HTML snippet: %s", soup.select_one("body") and soup.select_one("body").get_text()[:200]
            )

        jobs: list[dict] = []
        for card in cards[:15]:  # cap at 15 to keep response fast
            parsed = _parse_search_item(card)
            if parsed and parsed.get("title"):
                jobs.append(parsed)

        # Enrich first 10 with detail-page descriptions (slow, so limit)
        enriched = []
        for job in jobs[:10]:
            enriched.append(await _enrich_detail(job))
        enriched.extend(jobs[10:])

        result = _build_result(enriched, page)
        logger.info("karriere.at: %d jobs (keywords=%r, location=%r)", len(result["jobs"]), keywords, location)
        _store_result(_DOMAIN, keywords, location, page, result)
        return result

    except Exception as e:
        logger.error("karriere.at scrape error: %s", e, exc_info=True)
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "karriere.at ist vorübergehend nicht erreichbar. Bitte versuche es später erneut.",
        }
