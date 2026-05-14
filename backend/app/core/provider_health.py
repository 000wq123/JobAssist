from app.core.config import settings
from app.services.claude_service import get_groq_provider_status
from app.services.email_service import get_email_provider_status
from app.services.job_search import get_adzuna_provider_status


def get_provider_health() -> dict:
    groq = get_groq_provider_status()
    adzuna = get_adzuna_provider_status()
    email = get_email_provider_status()

    stripe = {
        "configured": bool(settings.STRIPE_SECRET_KEY),
        "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        "prices_configured": bool(settings.STRIPE_PRICE_PRO and settings.STRIPE_PRICE_MAX),
    }

    sentry = {
        "configured": bool(settings.SENTRY_DSN),
        "traces_sample_rate": settings.SENTRY_TRACES_SAMPLE_RATE,
    }

    return {
        "groq": groq,
        "adzuna": adzuna,
        "email": email,
        "stripe": stripe,
        "sentry": sentry,
    }
