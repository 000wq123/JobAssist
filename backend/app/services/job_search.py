from app.core import metrics
from app.core.config import settings
import httpx
import asyncio
import time
from collections import OrderedDict
from typing import Optional
import logging
import re
import html
from difflib import get_close_matches

logger = logging.getLogger(__name__)


# ── Adzuna result cache ──────────────────────────────────────────────────────
# Fronts the Adzuna API with an in-process LRU keyed by query tuple. Job
# postings change slowly (Adzuna updates daily), so a short TTL pays off on
# common queries (Wien + most popular keyword combos) and removes ~60–80 %
# of upstream calls during normal traffic.
#
# Why not Redis? Because we run 1–2 workers and the cache hit pattern is
# already covered by in-process; adding Redis is more ops surface for
# negligible gain at our scale. Migrate when we shard or grow >5 workers.
_CACHE_TTL_S = 300.0   # 5 minutes
_CACHE_MAX = 256
_cache: "OrderedDict[tuple, tuple[float, dict]]" = OrderedDict()


def _cache_key(keywords: Optional[str], location: Optional[str], job_type: Optional[str], page: int) -> tuple:
    return (
        (keywords or "").strip().lower(),
        (location or "").strip().lower(),
        (job_type or "").strip().lower(),
        int(page),
    )


def _cache_get(key: tuple) -> Optional[dict]:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL_S:
        # Expired — drop and miss.
        _cache.pop(key, None)
        return None
    # LRU bump
    _cache.move_to_end(key)
    return value


def _cache_set(key: tuple, value: dict) -> None:
    _cache[key] = (time.monotonic(), value)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


def clear_job_search_cache() -> int:
    """Wipe the cache. Returns the number of evicted entries (for tests)."""
    n = len(_cache)
    _cache.clear()
    return n


class _CircuitBreaker:
    """Trips after FAILURE_THRESHOLD consecutive Adzuna failures.
    While open, requests fail fast for RESET_SECONDS before auto-resetting.
    """
    FAILURE_THRESHOLD = 5
    RESET_SECONDS = 60

    def __init__(self) -> None:
        self._failures = 0
        self._tripped_at: Optional[float] = None

    def is_open(self) -> bool:
        if self._tripped_at is None:
            return False
        if time.monotonic() - self._tripped_at >= self.RESET_SECONDS:
            self._reset()
            return False
        return True

    def record_success(self) -> None:
        self._reset()

    def record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self.FAILURE_THRESHOLD:
            self._tripped_at = time.monotonic()
            metrics.gauge("jobassist_adzuna_circuit_breaker_open", 1)
            logger.warning(
                "Adzuna circuit breaker TRIPPED after %d consecutive failures — "
                "fast-failing for %ds", self._failures, self.RESET_SECONDS
            )

    def _reset(self) -> None:
        self._failures = 0
        self._tripped_at = None
        metrics.gauge("jobassist_adzuna_circuit_breaker_open", 0)

    def snapshot(self) -> dict:
        return {
            "open": self.is_open(),
            "failures": self._failures,
            "failure_threshold": self.FAILURE_THRESHOLD,
            "reset_seconds": self.RESET_SECONDS,
        }


_breaker = _CircuitBreaker()


def get_adzuna_provider_status() -> dict:
    return {
        "configured": bool(settings.ADZUNA_APP_ID and settings.ADZUNA_APP_KEY),
        "circuit_breaker": _breaker.snapshot(),
    }

# Adzuna Austrian endpoint — aggregates karriere.at, stepstone.at, etc.
# Docs: https://developer.adzuna.com/docs/search
_ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/at/search"

# German job type → Adzuna category + title match terms for post-filtering
# Adzuna category slugs: https://developer.adzuna.com/docs/search (category param)
_JOB_TYPE_MAP = {
    "vollzeit":      ("",                   []),                          # no title filter needed
    "teilzeit":      ("",                   ["teilzeit", "part-time", "part time", "halbtags"]),
    "praktikum":     ("",                   ["praktikum", "praktikantin", "praktikant", "trainee", "intern"]),
    "ferialjob":     ("",                   ["ferialjob", "ferialarbeit", "ferialpraktikum", "ferialbeschäftigung"]),
    "samstagsjob":   ("",                   ["samstagsjob", "samstag", "wochenende", "wochenendjob"]),
    "geringfügig":   ("",                   ["geringfügig", "geringfügige", "minijob", "aushilfe"]),
    "freiberuflich": ("",                   ["freelance", "freiberuflich", "selbstständig"]),
    "lehre":         ("apprenticeship",     ["lehre", "lehrling", "lehrstelle", "ausbildung", "apprentice"]),
}

# City name normalisation — Adzuna accepts German names fine but we ensure consistency
_CITY_MAP = {
    "vienna": "Wien",
    "austria": "",
    "österreich": "",
    "remote": "",
}

_KEYWORD_DICTIONARY = {
    "software", "engineer", "developer", "entwickler", "marketing", "manager",
    "sales", "verkauf", "assistant", "intern", "internship", "praktikum",
    "customer", "support", "service", "data", "analyst", "projekt", "project",
    "designer", "finance", "accounting", "accountant", "hr", "recruiter",
    "consultant", "berater", "operations", "admin", "administrator", "remote",
}


# Known recruiting emails for major Austrian & international employers active in Austria
_KNOWN_EMAILS: dict[str, str] = {
    "allianz":          "jobs@allianz.at",
    "omv":              "recruiting@omv.com",
    "erste bank":       "jobs@erstebank.at",
    "erste":            "jobs@erstebank.at",
    "raiffeisen":       "bewerbung@raiffeisen.at",
    "raiffeisenbank":   "bewerbung@raiffeisen.at",
    "bawag":            "karriere@bawag.com",
    "uniqa":            "bewerbung@uniqa.at",
    "vienna insurance": "bewerbung@vig.com",
    "wiener stadtwerke":"personal@wienerstadtwerke.at",
    "wien energie":     "bewerbung@wienenergie.at",
    "wiener linien":    "jobs@wienerlinien.at",
    "österreichische post": "bewerbung@post.at",
    "post":             "bewerbung@post.at",
    "telekom austria":  "karriere@telekom.at",
    "a1":               "karriere@a1.at",
    "magenta":          "jobs@magenta.at",
    "spar":             "jobs@spar.at",
    "hofer":            "bewerbung@hofer.at",
    "lidl":             "bewerbung@lidl.at",
    "billa":            "jobs@billa.at",
    "rewe":             "jobs@rewe-group.at",
    "manner":           "personal@manner.com",
    "kapsch":           "jobs@kapsch.net",
    "ams":              "bewerbung@ams.at",
    "ams ag":           "bewerbung@ams.at",
    "voestalpine":      "jobs@voestalpine.com",
    "andritz":          "karriere@andritz.com",
    "frequentis":       "jobs@frequentis.com",
    "siemens":          "jobs.at@siemens.com",
    "bosch":            "jobs.at@bosch.com",
    "pwc":              "career.at@pwc.com",
    "kpmg":             "karriere@kpmg.at",
    "deloitte":         "careers@deloitte.at",
    "ey":               "karriere@at.ey.com",
    "mckinsey":         "bewerbung@mckinsey.com",
    "red bull":         "jobs@redbull.com",
    "ikea":             "jobs.at@ikea.com",
    "amazon":           "jobs@amazon.at",
    "google":           "jobs@google.at",
    "microsoft":        "jobs@microsoft.at",
}


def _find_contact_email(company_name: str, company_url: str = "") -> str:
    """Return a recruiting email: known lookup → URL domain → generated slug."""
    # 1. Known company lookup (case-insensitive partial match)
    if company_name:
        name_lower = company_name.lower()
        for key, email in _KNOWN_EMAILS.items():
            if key in name_lower:
                return email

    # 2. Extract domain from company URL
    if company_url:
        match = re.search(r"https?://(?:www\.)?([^/?#]+)", company_url)
        if match:
            domain = match.group(1).lower()
            return f"bewerbung@{domain}"

    # 3. Generate slug-based fallback
    if company_name:
        clean = re.sub(
            r"\b(gmbh\s*&\s*co\.?\s*kg|gmbh|ag|og|kg|e\.u\.|e\.g\.|geg|se|inc|ltd)\b",
            "", company_name, flags=re.IGNORECASE,
        )
        for ch, rep in [("ä","ae"),("ö","oe"),("ü","ue"),("Ä","ae"),("Ö","oe"),("Ü","ue"),("ß","ss")]:
            clean = clean.replace(ch, rep)
        slug = re.sub(r"[^a-z0-9]", "", clean.lower())
        if slug:
            return f"bewerbung@{slug}.at"

    return "bewerbung@unternehmen.at"


def _strip_html(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    return " ".join(text.split())


def _normalise_location(location: Optional[str]) -> str:
    if not location:
        return ""
    return _CITY_MAP.get(location.strip().lower(), location.strip())


def _normalise_keyword_tokens(text: str) -> str:
    tokens = re.findall(r"[a-zA-ZäöüÄÖÜß]+", text or "")
    corrected = []
    for token in tokens:
        match = get_close_matches(token.lower(), _KEYWORD_DICTIONARY, n=1, cutoff=0.8)
        corrected.append(match[0] if match else token)
    return " ".join(corrected).strip()


async def search_jobs(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    page: int = 1,
    use_cache: bool = True,
) -> dict:
    """Search Austrian jobs via Adzuna.

    Results are cached in-process for `_CACHE_TTL_S` seconds. Pass
    `use_cache=False` to force a fresh upstream call (e.g. for scheduled
    job-alert dispatch, where stale results would be embarrassing).
    """
    app_id = settings.ADZUNA_APP_ID
    app_key = settings.ADZUNA_APP_KEY

    if not app_id or not app_key:
        logger.error("ADZUNA_APP_ID or ADZUNA_APP_KEY not set")
        return {"jobs": [], "total_count": 0, "page": page,
                "error": "Adzuna API-Schlüssel nicht konfiguriert. Bitte in .env eintragen."}

    if _breaker.is_open():
        logger.warning("Adzuna circuit breaker open — returning fast-fail response")
        return {"jobs": [], "total_count": 0, "page": page,
                "error": "Jobsuche vorübergehend nicht verfügbar. Bitte in einer Minute erneut versuchen."}

    cache_key = _cache_key(keywords, location, job_type, page)
    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            metrics.inc("jobassist_adzuna_cache_total", labels={"outcome": "hit"})
            return cached
        metrics.inc("jobassist_adzuna_cache_total", labels={"outcome": "miss"})
    else:
        metrics.inc("jobassist_adzuna_cache_total", labels={"outcome": "skip"})

    type_entry = _JOB_TYPE_MAP.get(job_type.lower()) if job_type else None

    # Build keyword string — include job type term so Adzuna searches for it
    search_what = keywords or ""
    if job_type and not type_entry:
        # Unknown job type — just append it
        search_what = f"{search_what} {job_type}".strip()
    elif type_entry and type_entry[1]:
        # Use first match term as the extra keyword (German, so Adzuna finds local results)
        search_what = f"{search_what} {type_entry[1][0]}".strip()

    where = _normalise_location(location)

    params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": 20,
        "what": search_what,
    }
    if where:
        params["where"] = where

    url = f"{_ADZUNA_BASE}/{page}"

    async def _fetch_jobs(what: str) -> dict:
        current_params = {**params, "what": what}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params=current_params, headers={"Content-Type": "application/json"})
            response.raise_for_status()
            return response.json()

    try:
        data = await _fetch_jobs(search_what)

        _breaker.record_success()

        jobs = data.get("results", [])
        corrected_search = _normalise_keyword_tokens(search_what)
        if not jobs and corrected_search and corrected_search.lower() != (search_what or "").lower():
            retry_data = await _fetch_jobs(corrected_search)
            retry_jobs = retry_data.get("results", [])
            if retry_jobs:
                data = retry_data
                jobs = retry_jobs
                logger.info("Adzuna keyword retry %r -> %r returned %d jobs", search_what, corrected_search, len(jobs))

        # Post-filter by job type — title must contain one of the match terms
        if type_entry and type_entry[1]:
            match_terms = type_entry[1]
            jobs = [j for j in jobs if any(t in j.get("title", "").lower() for t in match_terms)]

        logger.info(f"Adzuna: {len(jobs)} jobs (what={search_what!r}, where={where!r})")

        result = {
            "jobs": [
                {
                    "title": j.get("title", ""),
                    "company": j.get("company", {}).get("display_name", ""),
                    "location": j.get("location", {}).get("display_name", ""),
                    "description": _strip_html(j.get("description", "")),
                    "full_url": j.get("redirect_url", ""),
                    "salary": _format_salary(j),
                    "source": "Adzuna",
                    "source_id": str(j.get("id", "")),
                    "updated": j.get("created", ""),
                    "contact_email": _find_contact_email(
                        j.get("company", {}).get("display_name", ""),
                        j.get("company", {}).get("company_url", ""),
                    ),
                }
                for j in jobs
            ],
            "total_count": data.get("count", len(jobs)),
            "page": page,
        }
        # Only cache successful, non-empty responses. Empty results often mean
        # a query typo that the user will refine — caching them would just slow
        # the user down on the next attempt.
        if use_cache and result["jobs"]:
            _cache_set(cache_key, result)
        return result

    except httpx.HTTPStatusError as e:
        _breaker.record_failure()
        logger.error(
            "Adzuna HTTP error",
            extra={"status_code": e.response.status_code, "body": e.response.text[:300]},
        )
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jobsuche vorübergehend nicht verfügbar. Bitte in einer Minute erneut versuchen.",
        }
    except Exception as e:
        _breaker.record_failure()
        logger.error("Adzuna error", extra={"error_type": type(e).__name__, "error": str(e)})
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jobsuche vorübergehend nicht verfügbar. Bitte in einer Minute erneut versuchen.",
        }


def _format_salary(job: dict) -> str:
    min_s = job.get("salary_min")
    max_s = job.get("salary_max")
    if min_s and max_s:
        return f"€ {int(min_s):,} – {int(max_s):,}"
    if min_s:
        return f"ab € {int(min_s):,}"
    if max_s:
        return f"bis € {int(max_s):,}"
    return ""


async def search_jobs_by_preferences(user_profile: dict, page: int = 1) -> dict:
    locations = user_profile.get("desired_locations", []) or ["Wien"]
    job_types = user_profile.get("job_types", [])

    tasks = []
    for location in locations[:3]:
        if job_types:
            for job_type in job_types[:2]:
                tasks.append(search_jobs(location=location, job_type=job_type, page=page))
        else:
            tasks.append(search_jobs(location=location, page=page))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    seen = set()
    all_jobs = []
    for result in results:
        if isinstance(result, Exception):
            continue
        for job in result.get("jobs", []):
            key = (job.get("source_id"), job.get("title"), job.get("company"))
            if key not in seen:
                seen.add(key)
                all_jobs.append(job)

    return {"jobs": all_jobs[:50], "total_count": len(all_jobs), "page": page}
