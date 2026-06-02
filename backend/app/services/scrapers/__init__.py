"""Native job scrapers for Austrian job boards.

Each module returns the same schema as `search_jobs` (Adzuna) so callers
can treat scraped results and API results interchangeably.

Scrapers are rate-limited (max 1 req/sec per domain) and use realistic
browser headers. They degrade gracefully — if a site changes its markup,
the scraper returns an empty list with an error message instead of
crashing.
"""
from app.services.scrapers.karriere import search_karriere
from app.services.scrapers.willhaben import search_willhaben
from app.services.scrapers.ams import search_ams
from app.services.scrapers.base import clear_scraper_cache


def get_scraper_provider_status() -> dict:
    """Scrapers require no API keys — they are always 'configured'."""
    return {"configured": True}


__all__ = [
    "search_karriere",
    "search_willhaben",
    "search_ams",
    "clear_scraper_cache",
    "get_scraper_provider_status",
]
