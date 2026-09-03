"""Focused tests for company-logo resolution and safe fetching."""

import socket

import httpx
import pytest

from app.api.routes import logo_proxy
from app.api.routes.logo_proxy import (
    LogoTooLarge,
    UnsafeLogoURL,
    _company_domains,
    _fetch_image,
    _resolve_public_ips,
)


def test_company_domain_prefers_specific_full_name():
    domains = _company_domains("Anton Proksch Institut – API Betriebs gemeinnützige GmbH")

    assert domains[0] == "antonprokschinstitut.at"
    assert domains.index("antonprokschinstitut.at") < domains.index("anton.at")


def test_job_board_url_is_never_used_as_company_logo_domain():
    domains = _company_domains(
        "Bosch Group",
        "https://www.adzuna.at/details/123456789",
    )

    assert "adzuna.at" not in domains
    assert domains[0] == "bosch.at"


def test_direct_company_url_has_highest_priority():
    domains = _company_domains(
        "Example Manufacturing GmbH",
        "https://careers.example-manufacturing.at/jobs/42",
    )

    assert domains[0] == "example-manufacturing.at"
    assert domains[1] == "careers.example-manufacturing.at"


@pytest.mark.asyncio
async def test_redirect_to_loopback_is_rejected_before_second_request(monkeypatch):
    calls: list[str] = []

    async def resolve(host: str) -> list[str]:
        if host == "public.example":
            return ["93.184.216.34"]
        raise UnsafeLogoURL("Private or reserved network destinations are blocked")

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(
            302,
            headers={"location": "https://127.0.0.1/private"},
            request=request,
        )

    monkeypatch.setattr(logo_proxy, "_resolve_public_ips", resolve)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(UnsafeLogoURL):
            await _fetch_image(client, "https://public.example/favicon.ico")

    assert len(calls) == 1


@pytest.mark.asyncio
async def test_mixed_public_private_dns_answer_is_rejected(monkeypatch):
    async def fake_to_thread(_func, *_args, **_kwargs):
        return [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443)),
        ]

    monkeypatch.setattr(logo_proxy.asyncio, "to_thread", fake_to_thread)

    with pytest.raises(UnsafeLogoURL):
        await _resolve_public_ips("rebinding.example")


@pytest.mark.asyncio
async def test_oversized_image_is_rejected_from_content_length(monkeypatch):
    async def resolve(_host: str) -> list[str]:
        return ["93.184.216.34"]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={
                "content-type": "image/png",
                "content-length": str(logo_proxy._MAX_IMAGE_BYTES + 1),
            },
            content=b"x",
            request=request,
        )

    monkeypatch.setattr(logo_proxy, "_resolve_public_ips", resolve)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(LogoTooLarge):
            await _fetch_image(client, "https://public.example/favicon.ico")


@pytest.mark.asyncio
async def test_active_svg_content_is_not_proxied(monkeypatch):
    async def resolve(_host: str) -> list[str]:
        return ["93.184.216.34"]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "image/svg+xml"},
            content=b"<svg><script>alert(1)</script></svg>" * 3,
            request=request,
        )

    monkeypatch.setattr(logo_proxy, "_resolve_public_ips", resolve)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await _fetch_image(client, "https://public.example/favicon.ico") is None


@pytest.mark.asyncio
async def test_invalid_url_port_is_rejected_before_network(monkeypatch):
    async def resolve(_host: str) -> list[str]:
        return ["93.184.216.34"]

    def handler(request: httpx.Request) -> httpx.Response:
        pytest.fail(f"network request should not be attempted: {request.url}")

    monkeypatch.setattr(logo_proxy, "_resolve_public_ips", resolve)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(UnsafeLogoURL, match="port"):
            await _fetch_image(client, "https://public.example:not-a-port/favicon.ico")


def test_cache_enforces_total_byte_budget(monkeypatch):
    logo_proxy._CACHE.clear()
    monkeypatch.setattr(logo_proxy, "_MAX_CACHE_BYTES", 10)

    logo_proxy._cache_set("one", (b"123456", "image/png"))
    logo_proxy._cache_set("two", (b"abcdef", "image/png"))

    assert "one" not in logo_proxy._CACHE
    assert logo_proxy._CACHE["two"][0] == b"abcdef"
