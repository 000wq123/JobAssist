"""Logo proxy — fetches company/platform favicons server-side, bypassing
browser CORS / CORP / hotlink restrictions that block cross-origin <img> loads.

/proxy/logo/best  – resolve company name → domain candidates → first valid image
/proxy/logo       – fetch a single allowed URL (used for course platform logos)
"""
from __future__ import annotations

import asyncio
from collections import OrderedDict
import ipaddress
import re
import logging
import socket
from urllib.parse import urljoin, urlparse, urlsplit, urlunsplit

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

_CACHE: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
_MAX_CACHE = 600
_MAX_CACHE_BYTES = 32 * 1024 * 1024
_MAX_IMAGE_BYTES = 2 * 1024 * 1024
_MAX_REDIRECTS = 3
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_SAFE_IMAGE_TYPES = {
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/vnd.microsoft.icon",
    "image/webp",
    "image/x-icon",
}


class UnsafeLogoURL(ValueError):
    """The URL could reach a non-public network destination."""


class LogoTooLarge(ValueError):
    """The remote response exceeded the image byte limit."""


def _cache_get(key: str) -> tuple[bytes, str] | None:
    value = _CACHE.get(key)
    if value is not None:
        _CACHE.move_to_end(key)
    return value


def _cache_set(key: str, value: tuple[bytes, str]) -> None:
    if len(value[0]) > _MAX_IMAGE_BYTES:
        return
    _CACHE.pop(key, None)
    _CACHE[key] = value
    total_bytes = sum(len(content) for content, _media_type in _CACHE.values())
    while _CACHE and (len(_CACHE) > _MAX_CACHE or total_bytes > _MAX_CACHE_BYTES):
        _old_key, (old_content, _old_media_type) = _CACHE.popitem(last=False)
        total_bytes -= len(old_content)


def _public_ip(value: str) -> bool:
    try:
        return ipaddress.ip_address(value).is_global
    except ValueError:
        return False


async def _resolve_public_ips(host: str) -> list[str]:
    """Resolve once and return only public addresses for connection pinning."""
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is not None:
        if not literal.is_global:
            raise UnsafeLogoURL("Private or reserved network destinations are blocked")
        return [literal.compressed]

    try:
        records = await asyncio.to_thread(
            socket.getaddrinfo,
            host,
            443,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise UnsafeLogoURL("Logo host could not be resolved") from exc

    addresses = list(dict.fromkeys(record[4][0] for record in records))
    # Reject the entire answer if it mixes public and private addresses. This
    # avoids choosing a seemingly safe record from a rebinding-style response.
    if not addresses or not all(_public_ip(address) for address in addresses):
        raise UnsafeLogoURL("Private or reserved network destinations are blocked")
    return addresses


async def _pinned_request(
    client: httpx.AsyncClient,
    url: str,
) -> httpx.Response:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise UnsafeLogoURL("Only credential-free HTTPS URLs are allowed")
    try:
        port = parsed.port
    except ValueError as exc:
        raise UnsafeLogoURL("Invalid HTTPS port") from exc
    if port not in (None, 443):
        raise UnsafeLogoURL("Only the standard HTTPS port is allowed")

    host = parsed.hostname.rstrip(".").lower()
    addresses = await _resolve_public_ips(host)
    address = addresses[0]
    pinned_host = f"[{address}]" if ":" in address else address
    pinned_url = urlunsplit(("https", pinned_host, parsed.path or "/", parsed.query, ""))
    request = client.build_request(
        "GET",
        pinned_url,
        headers={**_HEADERS, "Host": host},
        extensions={"sni_hostname": host},
    )
    return await client.send(request, stream=True)


async def _fetch_image(
    client: httpx.AsyncClient,
    url: str,
    *,
    min_size: int = 64,
) -> tuple[bytes, str] | None:
    """Fetch an image with address pinning, redirect checks, and byte limits."""
    current = url
    for redirect_count in range(_MAX_REDIRECTS + 1):
        response = await _pinned_request(client, current)
        try:
            if response.status_code in _REDIRECT_STATUSES:
                location = response.headers.get("location")
                if not location or redirect_count == _MAX_REDIRECTS:
                    return None
                current = urljoin(current, location)
                continue
            if response.status_code != 200:
                return None

            media_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
            # SVG is intentionally excluded: returning attacker-controlled
            # active XML from our own origin is unnecessary for favicons.
            if media_type not in _SAFE_IMAGE_TYPES:
                return None
            content_length = response.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > _MAX_IMAGE_BYTES:
                        raise LogoTooLarge("Remote image is too large")
                except ValueError as exc:
                    raise LogoTooLarge("Invalid remote image size") from exc

            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes():
                total += len(chunk)
                if total > _MAX_IMAGE_BYTES:
                    raise LogoTooLarge("Remote image is too large")
                chunks.append(chunk)
            data = b"".join(chunks)
            if len(data) < min_size:
                return None
            return data, media_type
        finally:
            await response.aclose()
    return None

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
    if cached := _cache_get(url):
        return cached
    try:
        result = await _fetch_image(client, url, min_size=min_size)
        if result is not None:
            _cache_set(url, result)
        return result
    except (httpx.HTTPError, UnsafeLogoURL, LogoTooLarge):
        return None


async def _fetch_first_image(domains: list[str]) -> tuple[bytes, str] | None:
    """Try high-resolution direct paths and favicon providers in parallel."""
    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=3.5,
        trust_env=False,
    ) as client:
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
    if cached := _cache_get(cache_key):
        content, media_type = cached
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
    _cache_set(cache_key, (content, media_type))

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

    if cached := _cache_get(url):
        content, media_type = cached
        return Response(content=content, media_type=media_type,
                        headers={"Cache-Control": "public, max-age=604800, immutable"})

    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=5,
        trust_env=False,
    ) as client:
        try:
            result = await _fetch_image(client, url)
        except UnsafeLogoURL as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except LogoTooLarge:
            raise HTTPException(status_code=413, detail="Remote image is too large")
        except httpx.HTTPError as exc:
            log.debug("logo_proxy fetch error %s: %s", url, exc)
            raise HTTPException(status_code=502, detail="Fetch failed")

    if result is None:
        raise HTTPException(status_code=404, detail="Not found")
    content, media_type = result
    _cache_set(url, result)

    return Response(content=content, media_type=media_type,
                    headers={"Cache-Control": "public, max-age=604800, immutable"})
