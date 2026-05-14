import json
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "Job Application Assistant"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    # Database — must be set via environment variable (no insecure default)
    DATABASE_URL: str

    # Auth (JWT)
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # API Keys
    GROQ_API_KEY: str = ""
    JOOBLE_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO: str = ""   # Stripe Price ID for Pro plan
    STRIPE_PRICE_MAX: str = ""   # Stripe Price ID for Max plan
    FRONTEND_URL: str = "https://jobassist.tech"

    # Email — Brevo HTTP API (replaces SMTP, works on Railway free tier)
    BREVO_API_KEY: str = ""
    EMAILS_FROM_EMAIL: str = "jobassistalert@gmail.com"
    EMAILS_FROM_NAME: str = "JobAssist"

    # Legacy SMTP fields (unused but kept so existing env vars don't break startup)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True

    # Admin
    ADMIN_SECRET: str = ""  # Set in Railway env to protect admin endpoints

    # CORS — comma-separated string, e.g. "https://app.vercel.app,http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://jobassist.tech,https://www.jobassist.tech"
    # Optional regex for dynamic origins like Vercel previews, e.g. "https://job-assist-.*\.vercel\.app"
    ALLOWED_ORIGIN_REGEX: str = ""

    # ── Auth cookies ─────────────────────────────────────────────────────────
    # Refresh token is stored in an httpOnly cookie (XSS-proof). Access token
    # is returned in the response body and held only in memory by the SPA.
    #
    # Same-eTLD+1 deployment (recommended) — e.g. frontend at jobassist.tech,
    # backend at api.jobassist.tech: set COOKIE_DOMAIN=".jobassist.tech",
    # COOKIE_SAMESITE="lax", COOKIE_SECURE=true.
    #
    # Cross-site deployment — e.g. frontend at jobassist.tech, backend at
    # *.up.railway.app: leave COOKIE_DOMAIN empty, set COOKIE_SAMESITE="none",
    # COOKIE_SECURE=true. Browsers may treat these as third-party cookies
    # (Safari ITP, Firefox ETP) — moving the backend to a same-eTLD subdomain
    # is the durable fix.
    COOKIE_DOMAIN: str = ""
    COOKIE_SAMESITE: str = "none"   # "lax" | "strict" | "none"
    COOKIE_SECURE: bool = True       # MUST be True when SameSite=none
    COOKIE_PATH: str = "/api/auth"   # Refresh cookie scoped to auth endpoints only
    REFRESH_COOKIE_NAME: str = "ja_refresh"

    @property
    def allowed_origins_list(self) -> List[str]:
        raw = (self.ALLOWED_ORIGINS or "").strip()
        if not raw:
            return []

        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except json.JSONDecodeError:
                pass

        return [o.strip() for o in raw.split(",") if o.strip()]

settings = Settings()

_INSECURE_DEFAULT_KEY = "change-me-in-production"
if settings.SECRET_KEY == _INSECURE_DEFAULT_KEY:
    if not settings.DEBUG:
        import sys
        print("FATAL: SECRET_KEY is set to the insecure default. Set a strong random SECRET_KEY.", file=sys.stderr)
        sys.exit(1)
    else:
        import warnings
        warnings.warn(
            "SECRET_KEY is set to the insecure default value. "
            "Set a strong random SECRET_KEY in your environment before going to production.",
            stacklevel=1,
        )
