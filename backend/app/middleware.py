"""HTTP middleware: request-id tagging, body-size limit, security headers,
and CSRF Origin enforcement on cookie-authenticated state-changing routes.
"""
from __future__ import annotations

import logging
import re
import time
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from app.core import metrics
from app.core.config import settings
from app.core.logging import (
    elapsed_ms,
    new_request_id,
    reset_request_id,
    set_request_id,
)

logger = logging.getLogger(__name__)

# Hard cap on request body size. Anything larger is rejected before the route
# handler is invoked. Routes that legitimately need bigger payloads (resume
# uploads — currently capped to 5 MB by the route) are within this limit.
MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024  # 5 MiB

# State-changing methods that must come from an allowed Origin when they carry
# our auth cookie. Defends against the narrow CSRF surface that survives our
# strict CORS config (e.g. form-encoded posts that don't preflight).
_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Routes that accept cookie-only credentials and therefore need explicit
# Origin enforcement. (Bearer-only routes are already protected by the absence
# of credentials cross-origin.)
_COOKIE_AUTH_PATHS = re.compile(r"^/api/auth/(refresh|logout)$")


def _origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if origin in settings.allowed_origins_list:
        return True
    if settings.ALLOWED_ORIGIN_REGEX:
        try:
            return bool(re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin))
        except re.error:
            return False
    return False


def _build_security_headers(request: Request) -> dict[str, str]:
    """Headers attached to every response. CSP is narrow because the API
    serves only JSON; the FastAPI docs UI gets a relaxed CSP below."""
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
        "Cache-Control": "no-store",
        # CSP must be permissive for /docs + /redoc which Swagger/ReDoc inject.
        # All other paths get the tightest possible policy.
        "Content-Security-Policy": (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        ),
    }
    path = request.url.path
    if path in {"/docs", "/redoc", "/openapi.json"} or path.startswith("/docs/"):
        headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )
    # HSTS only on TLS — Strict-Transport-Security over plain HTTP is ignored
    # and trips security scanners. We still set it when behind a proxy that
    # terminates TLS (X-Forwarded-Proto=https).
    forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
    if request.url.scheme == "https" or forwarded_proto == "https":
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return headers


def _cors_headers_for(request: Request) -> dict[str, str]:
    """CORS headers to echo on error responses. Starlette's CORSMiddleware
    does not run on exception responses raised past it (unhandled 500s from
    BaseHTTPMiddleware, validation errors, etc.), which surfaces in the
    browser as a confusing 'blocked by CORS policy' error instead of the real
    4xx/5xx. Mirror the origin here when it is allowed."""
    origin = request.headers.get("origin", "")
    if not origin:
        return {}
    if origin in settings.allowed_origins_list or (
        settings.ALLOWED_ORIGIN_REGEX
        and bool(re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin))
    ):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


def install_middleware(app: FastAPI) -> None:
    """Register the unified HTTP middleware stack on `app`."""

    @app.middleware("http")
    async def http_middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # 1. request_id correlation
        request_id = request.headers.get("x-request-id") or new_request_id()
        request.state.request_id = request_id
        token = set_request_id(request_id)
        start = time.perf_counter()

        try:
            # 2. body-size cap (front of pipeline so we never read a huge body)
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > MAX_REQUEST_BODY_BYTES:
                        return JSONResponse(
                            status_code=413,
                            content={
                                "detail": "Request body too large",
                                "request_id": request_id,
                            },
                            headers={"X-Request-ID": request_id},
                        )
                except (ValueError, TypeError):
                    pass  # malformed header — let the route layer decide

            # 3. CSRF Origin enforcement on cookie-only state-changing routes
            if request.method in _UNSAFE_METHODS and _COOKIE_AUTH_PATHS.match(request.url.path):
                origin = request.headers.get("origin") or ""
                referer = request.headers.get("referer") or ""
                # Allow when either the Origin header or (as a fallback) the Referer
                # matches an allowed origin. Some browsers strip Origin from
                # same-origin requests; Referer covers that case.
                ref_origin = ""
                if referer:
                    try:
                        from urllib.parse import urlparse

                        parsed = urlparse(referer)
                        if parsed.scheme and parsed.netloc:
                            ref_origin = f"{parsed.scheme}://{parsed.netloc}"
                    except Exception:
                        ref_origin = ""
                if not (_origin_allowed(origin) or _origin_allowed(ref_origin)):
                    logger.warning(
                        "csrf.origin_rejected",
                        extra={
                            "path": request.url.path,
                            "origin": origin or "-",
                            "referer": ref_origin or "-",
                            "request_id": request_id,
                        },
                    )
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": "Cross-origin request rejected",
                            "request_id": request_id,
                        },
                        headers={"X-Request-ID": request_id},
                    )

            # 4. main pipeline
            response: Response = await call_next(request)
        except Exception as exc:
            # Unhandled exception: return a 500 with CORS headers so the
            # browser shows the real status instead of a CORS block.
            logger.exception(
                "Unhandled exception",
                extra={"path": request.url.path, "method": request.method},
            )
            detail = str(exc) if settings.DEBUG else "Internal server error"
            response = JSONResponse(
                status_code=500,
                content={"detail": detail, "request_id": request_id},
                headers={
                    **_cors_headers_for(request),
                    "X-Request-ID": request_id,
                },
            )
        finally:
            duration_ms = elapsed_ms(start)
            status_code = getattr(locals().get("response"), "status_code", 500)
            logger.info(
                "HTTP request completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "request_id": request_id,
                },
            )
            # Bucket the status code so we don't blow up cardinality
            # (e.g. avoid one label per unique 4xx).
            status_bucket = f"{status_code // 100}xx"
            metrics.inc(
                "jobassist_http_requests_total",
                labels={"method": request.method, "status": status_bucket},
            )
            reset_request_id(token)

        # 5. unified security headers + request-id echo
        response.headers["X-Request-ID"] = request_id
        for key, value in _build_security_headers(request).items():
            response.headers.setdefault(key, value)
        # CORS echo on error responses (401/404/422/429/5xx): Starlette's
        # CORSMiddleware can miss responses that bypass it (exceptions raised
        # past BaseHTTPMiddleware, some HTTPException paths), which the browser
        # then reports as a CORS block instead of the real status.
        if response.status_code >= 400:
            for key, value in _cors_headers_for(request).items():
                response.headers.setdefault(key, value)
        return response
