"""Logo proxy — fetches company/platform favicons server-side, bypassing
browser CORS / CORP / hotlink restrictions that block cross-origin <img> loads.

/proxy/logo/best  – resolve company name → domain candidates → first valid image
/proxy/logo       – fetch a single allowed URL (used for course platform logos)
"""
from __future__ import annotations

import asyncio
import re
import logging
import urllib.parse
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


def _company_domains(company: str, url: str = "") -> list[str]:
    """Return ordered list of domains to probe for a company logo."""
    if not company or _NON_COMPANY.match(company.strip()):
        return []

    n = company.lower()
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

    seen: set[str] = set()
    candidates: list[str] = []
    for c in filter(None, [*tokens, slug, slug_h, pair, pair_h]):
        if c not in seen:
            seen.add(c)
            candidates.append(c)

    domains: list[str] = []
    for tld in (".at", ".net", ".com", ".de", ".org"):
        for c in candidates:
            domains.append(f"{c}{tld}")

    if url:
        try:
            host = urlparse(url).hostname or ""
            host = re.sub(r"^www\.", "", host)
            parts = host.split(".")
            root = ".".join(parts[-2:]) if len(parts) > 2 else host
            for d in [root, host]:
                if d and d not in domains:
                    domains.append(d)
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
    """Try direct paths, DuckDuckGo, and Google favicon for each domain; return first valid image."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=3.5) as client:
        # Pass 1: direct standard paths (top candidates only for speed)
        for domain in domains[:6]:
            for path in ("/apple-touch-icon.png", "/favicon.ico"):
                result = await _try_url(client, f"https://www.{domain}{path}")
                if result:
                    return result

        # Pass 2: DuckDuckGo favicon proxy
        seen_ddg: set[str] = set()
        for domain in domains:
            root = ".".join(domain.split(".")[-2:]) if domain.count(".") >= 2 else domain
            if root in seen_ddg:
                continue
            seen_ddg.add(root)
            if len(seen_ddg) > 3:
                break
            ddg_url = f"https://icons.duckduckgo.com/ip3/{root}.ico"
            result = await _try_url(client, ddg_url, min_size=100)
            if result:
                return result

        # Pass 3: Google favicon service (png, higher quality)
        seen_google: set[str] = set()
        for domain in domains:
            root = ".".join(domain.split(".")[-2:]) if domain.count(".") >= 2 else domain
            if root in seen_google:
                continue
            seen_google.add(root)
            if len(seen_google) > 3:
                break
            google_url = f"https://www.google.com/s2/favicons?domain={root}&sz=128"
            result = await _try_url(client, google_url, min_size=100)
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
                        headers={"Cache-Control": "public, max-age=86400"})

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
                    headers={"Cache-Control": "public, max-age=86400"})


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
                        headers={"Cache-Control": "public, max-age=86400"})

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
                    headers={"Cache-Control": "public, max-age=86400"})
