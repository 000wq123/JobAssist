"""Logo proxy — fetches company/platform favicons server-side, bypassing
browser CORS / CORP / hotlink restrictions that block cross-origin <img> loads.

/proxy/logo/best  – resolve company name → domain candidates → first valid image
/proxy/logo       – fetch a single allowed URL (used for course platform logos)
"""
from __future__ import annotations

import asyncio
import re
import logging
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.core.security import get_current_user
from app.models.user import User

log = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED = re.compile(
    r"^https://www\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+/"
    r"(apple-touch-icon\.png|favicon\.ico)$"
)

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124",
    "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
}

_CACHE: dict[str, tuple[bytes, str]] = {}
_MAX_CACHE = 600

_NON_COMPANY = re.compile(
    r"^(wen wir suchen|was wir bieten|das bringst du mit|wir bieten|"
    r"deine aufgaben|ihr profil|das erwartet)",
    re.IGNORECASE,
)
_STOP = re.compile(
    r"\b(gmbh|ag|kg|ohg|se|nv|inc|ltd|oesterreich|osterreich|austria|"
    r"group|holding|co\.?\s*kg|services?|solutions?|operations?|"
    r"personaldienstleistungen|dienstleistungen|wirtschaftskammer|"
    r"gesellschaft|mbh|m\.b\.h|s\.r\.o|s\.p\.a|"
    r"tirol|wien|graz|salzburg|linz|steiermark|niederoesterreich|"
    r"international|europe|europa|global|worldwide)\b",
    re.IGNORECASE,
)
_GENERIC = {
    "bank", "center", "centre", "hotel", "shop", "store", "online",
    "media", "tech", "digital", "web", "it", "pro", "plus", "max",
    "net", "group", "alpha", "beta",
    "telekom", "telecom", "consulting", "management", "marketing",
    "gourmet", "personal", "service", "services", "software",
    "daten", "data", "systems", "systeme", "solutions", "logistics",
    "realty", "finance", "immobilien", "handel", "vertrieb",
}

_JOB_BOARD_DOMAINS = {
    "adzuna.at", "adzuna.com", "ams.at", "indeed.com", "indeed.at",
    "jooble.org", "karriere.at", "linkedin.com", "stepstone.at",
    "willhaben.at", "xing.com", "jobs.at",
}


def _is_job_board(host: str) -> bool:
    host = host.lower().removeprefix("www.")
    return any(host == domain or host.endswith(f".{domain}") for domain in _JOB_BOARD_DOMAINS)


def _company_domains(company: str, url: str = "") -> list[str]:
    """Return ordered list of domains to probe for a company logo."""
    if not company or _NON_COMPANY.match(company.strip()):
        return []

    n = company.lower()
    # Job feeds often append a legal/operator name after a dash. The public
    # brand before that separator is the useful part for domain matching.
    n = re.split(r"\s+[\-–—|]\s+", n, maxsplit=1)[0]
    for src, dst in [("ä","ae"),("ö","oe"),("ü","ue"),("ß","ss")]:
        n = n.replace(src, dst)

    clean = _STOP.sub("", n)
    clean = re.sub(r"\s+", " ", clean).strip()

    tokens = [
        t for t in re.split(r"[^a-z0-9]+", clean)
        if 2 <= len(t) <= 12 and t not in _GENERIC
    ]
    slug   = re.sub(r"[^a-z0-9]+", "", clean)
    slug_h = re.sub(r"[^a-z0-9]+", "-", clean).strip("-")
    pair   = "".join(tokens[:2])
    pair_h = "-".join(tokens[:2])

    # Company names containing an embedded TLD ("thalia.at GmbH") produce a
    # corrupted slug ("thaliaat") that resolves nowhere. Strip a trailing
    # .at/.de/.com from the name before slugifying so "thalia.at" probes the
    # real domain first.
    if re.search(r"\.[a-z]{2,3}\s*$", clean) or re.search(r"\s[a-z]{2,3}\.\s", clean):
        brand_part = re.sub(r"\s*[a-z]{2,3}\.\s*$|\.[a-z]{2,3}\s*$", "", clean).strip()
        if brand_part and brand_part != clean:
            brand_slug = re.sub(r"[^a-z0-9]+", "", brand_part)
            if 2 <= len(brand_slug) <= 63:
                clean = brand_part
                slug = brand_slug
                tokens = [
                    t for t in re.split(r"[^a-z0-9]+", clean)
                    if 2 <= len(t) <= 12 and t not in _GENERIC
                ] or tokens
                pair = "".join(tokens[:2])
                pair_h = "-".join(tokens[:2])

    seen: set[str] = set()
    candidates: list[str] = []
    # Ordering matters: the provider fallback passes only probe the first
    # handful of candidates, so the most-likely-real domains must come first.
    #  * dash-form pair ("drees-sommer") beats the concatenated slug — most
    #    multi-word brands use dashes in their domain
    #  * very long slugs (>24 chars) never resolve; skip them entirely
    #  * contraction "tu" + "wien" -> "tuwien" catches TU-style abbreviations
    #  * short first token ("dm", "billa") beats any slug variant
    short_first = tokens[0] if tokens and len(tokens[0]) <= 3 else None
    contraction = (
        tokens[0][:2] + tokens[-1]
        if len(tokens) > 1 and len(tokens[0]) > 3 and len(tokens[-1]) >= 3
        else None
    )
    probe_order: list[str | None] = []
    if short_first:
        probe_order.append(short_first)
    if len(slug) <= 24:
        probe_order.append(slug)
    probe_order.append(pair_h)
    if len(slug_h) <= 24:
        probe_order.append(slug_h)
    probe_order.append(pair)
    probe_order.append(contraction)
    for c in filter(None, [*probe_order, *tokens]):
        if 2 <= len(c) <= 63 and c not in seen:
            seen.add(c)
            candidates.append(c)

    domains: list[str] = [
        f"{candidate}{tld}"
        for candidate in candidates
        for tld in (".at", ".com", ".de", ".net", ".org")
    ]

    if url:
        try:
            host = urlparse(url).hostname or ""
            host = re.sub(r"^www\.", "", host)
            parts = host.split(".")
            root = ".".join(parts[-2:]) if len(parts) > 2 else host
            if not _is_job_board(host):
                preferred = list(dict.fromkeys(domain for domain in [root, host] if domain))
                domains = preferred + [domain for domain in domains if domain not in preferred]
        except Exception:
            pass

    return domains


async def _try_url(client: httpx.AsyncClient, url: str, min_size: int = 64) -> tuple[bytes, str] | None:
    """Fetch url, return (bytes, content_type) if it's a valid image, else None."""
    if url in _CACHE:
        return _CACHE[url]
    try:
        resp = await client.get(url, headers=_HEADERS)
        if resp.status_code != 200:
            return None
        ct = resp.headers.get("content-type", "").split(";")[0].strip()
        if not ct.startswith("image/"):
            return None
        data = resp.content
        if len(data) < min_size:
            return None
        if len(_CACHE) < _MAX_CACHE:
            _CACHE[url] = (data, ct)
        return data, ct
    except Exception:
        return None


async def _fetch_first_image(domains: list[str]) -> tuple[bytes, str] | None:
    """Try high-resolution direct paths and favicon providers in parallel."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=3.5) as client:
        async def first_valid(urls: list[str], min_size: int) -> tuple[bytes, str] | None:
            results = await asyncio.gather(*(
                _try_url(client, candidate, min_size=min_size) for candidate in urls
            ))
            return next((result for result in results if result is not None), None)

        # Pass 1: company-owned, high-resolution icon paths. Requests run in
        # parallel, but results are selected in domain/path priority order.
        direct_urls = [
            f"https://{prefix}{domain}{path}"
            for domain in domains[:4]
            for path in (
                "/apple-touch-icon.png",
                "/android-chrome-192x192.png",
                "/favicon-192x192.png",
                "/favicon.ico",
            )
            for prefix in ("", "www.")
        ]
        result = await first_valid(direct_urls, min_size=128)
        if result:
            return result

        # Pass 2: Google returns a consistently sized PNG and is preferable to
        # tiny ICO files when a direct high-resolution asset is unavailable.
        # Coverage must span short brand candidates ("mooons", "ortoproban",
        # "tuwien"), not just the long slug variants that dominate the head of
        # `domains` — otherwise the short, most-likely-real candidate never
        # gets probed by providers. Prioritize short candidates first.
        provider_domains = list(dict.fromkeys(
            sorted(domains, key=len)[:12] + domains[:6]
        ))
        google_urls = [
            f"https://www.google.com/s2/favicons?domain={domain}&sz=256"
            for domain in provider_domains
        ]
        result = await first_valid(google_urls, min_size=128)
        if result:
            return result

        # Pass 3: final resilient fallback.
        ddg_urls = [f"https://icons.duckduckgo.com/ip3/{domain}.ico" for domain in provider_domains]
        result = await first_valid(ddg_urls, min_size=100)
        if result:
            return result

        # Pass 4: icon-provider images with a small floor. Several real
        # Austrian brands (dm, thalia) only serve a ~1–15 KB icon through the
        # providers; the 100-byte floor rejected those valid logos and left
        # the dashboard with letter chips instead of real logos.
        provider_urls = [
            *[
                f"https://www.google.com/s2/favicons?domain={domain}&sz=64"
                for domain in provider_domains
            ],
            *[
                f"https://icons.duckduckgo.com/ip3/{domain}.ico"
                for domain in provider_domains
            ],
        ]
        result = await first_valid(provider_urls, min_size=64)
        if result:
            return result

    return None


@router.get("/proxy/logo/best")
async def proxy_logo_best(
    company: str = Query(default=""),
    url: str = Query(default=""),
    current_user: User = Depends(get_current_user),
):
    """Single call: resolve company → domains → fetch first valid logo image."""
    cache_key = f"best:{company}:{url}"
    if cache_key in _CACHE:
        content, media_type = _CACHE[cache_key]
        return Response(content=content, media_type=media_type,
                        headers={"Cache-Control": "public, max-age=604800, immutable"})

    domains = _company_domains(company, url)
    if not domains:
        raise HTTPException(status_code=404, detail="No logo candidates")

    try:
        result = await asyncio.wait_for(_fetch_first_image(domains), timeout=7.0)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=404, detail="Logo lookup timed out")
    if result is None:  # type: ignore[union-attr]
        raise HTTPException(status_code=404, detail="No logo found")

    content, media_type = result
    if len(_CACHE) < _MAX_CACHE:
        _CACHE[cache_key] = (content, media_type)

    return Response(content=content, media_type=media_type,
                    headers={"Cache-Control": "public, max-age=604800, immutable"})


@router.get("/proxy/logo")
async def proxy_logo(
    url: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Proxy a single apple-touch-icon.png or favicon.ico URL."""
    if not _ALLOWED.match(url):
        raise HTTPException(status_code=400, detail="URL not permitted")

    if url in _CACHE:
        content, media_type = _CACHE[url]
        return Response(content=content, media_type=media_type,
                        headers={"Cache-Control": "public, max-age=604800, immutable"})

    async with httpx.AsyncClient(follow_redirects=True, timeout=5) as client:
        try:
            resp = await client.get(url, headers=_HEADERS)
        except Exception as exc:
            log.debug("logo_proxy fetch error %s: %s", url, exc)
            raise HTTPException(status_code=502, detail="Fetch failed")

    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Not found")

    media_type = resp.headers.get("content-type", "image/png").split(";")[0].strip()
    if not media_type.startswith("image/"):
        raise HTTPException(status_code=404, detail="Not an image")

    content = resp.content
    if len(_CACHE) < _MAX_CACHE:
        _CACHE[url] = (content, media_type)

    return Response(content=content, media_type=media_type,
                    headers={"Cache-Control": "public, max-age=604800, immutable"})
