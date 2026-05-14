from app.core.provider_health import get_provider_health
from app.core.config import settings
from app.services.claude_service import get_groq_provider_status
from app.services.email_service import get_email_provider_status
from app.services.job_search import get_adzuna_provider_status


def test_provider_health_shape():
    health = get_provider_health()

    assert "groq" in health
    assert "adzuna" in health
    assert "email" in health
    assert "stripe" in health
    assert "sentry" in health

    assert "configured" in health["groq"]
    assert "model" in health["groq"]
    assert "configured" in health["adzuna"]
    assert "circuit_breaker" in health["adzuna"]
    assert "active_provider" in health["email"]
    assert "configured" in health["stripe"]
    assert "configured" in health["sentry"]


def test_groq_provider_status_shape():
    status = get_groq_provider_status()
    assert set(status.keys()) == {"configured", "model"}


def test_email_provider_status_shape():
    status = get_email_provider_status()
    assert "brevo_configured" in status
    assert "smtp_configured" in status
    assert "active_provider" in status


def test_adzuna_provider_status_shape():
    status = get_adzuna_provider_status()
    assert "configured" in status
    assert "circuit_breaker" in status
    assert "open" in status["circuit_breaker"]


def test_email_provider_prefers_brevo(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "x")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USER", "user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "pass")
    status = get_email_provider_status()
    assert status["active_provider"] == "brevo"


def test_email_provider_uses_smtp_when_brevo_missing(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USER", "user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "pass")
    status = get_email_provider_status()
    assert status["active_provider"] == "smtp"


def test_provider_health_sentry_and_stripe_flags(monkeypatch):
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://example@sentry.invalid/1")
    monkeypatch.setattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.5)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec")
    monkeypatch.setattr(settings, "STRIPE_PRICE_PRO", "price_pro")
    monkeypatch.setattr(settings, "STRIPE_PRICE_MAX", "price_max")

    health = get_provider_health()
    assert health["sentry"]["configured"] is True
    assert health["sentry"]["traces_sample_rate"] == 0.5
    assert health["stripe"]["configured"] is True
    assert health["stripe"]["webhook_configured"] is True
    assert health["stripe"]["prices_configured"] is True
