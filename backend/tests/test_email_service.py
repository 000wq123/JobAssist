"""Unit tests for app.services.email_service.

No real HTTP calls or SMTP connections are made — providers are mocked.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services.email_service import (
    _rank_jobs,
    _safe_url,
    send_transactional_email,
    get_email_provider_status,
)


# ---------------------------------------------------------------------------
# get_email_provider_status
# ---------------------------------------------------------------------------

def test_provider_status_brevo_active(monkeypatch):
    from app.core import config as cfg
    monkeypatch.setattr(cfg.settings, "BREVO_API_KEY", "key_abc", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_HOST", "", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_USER", "", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_PASSWORD", "", raising=False)

    status = get_email_provider_status()

    assert status["active_provider"] == "brevo"
    assert status["brevo_configured"] is True
    assert status["smtp_configured"] is False


def test_provider_status_none_when_unconfigured(monkeypatch):
    from app.core import config as cfg
    monkeypatch.setattr(cfg.settings, "BREVO_API_KEY", "", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_HOST", "", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_USER", "", raising=False)
    monkeypatch.setattr(cfg.settings, "SMTP_PASSWORD", "", raising=False)

    status = get_email_provider_status()

    assert status["active_provider"] is None


# ---------------------------------------------------------------------------
# _safe_url
# ---------------------------------------------------------------------------

def test_safe_url_allows_https():
    assert _safe_url("https://example.com") == "https://example.com"


def test_safe_url_allows_http():
    assert _safe_url("http://example.com") == "http://example.com"


def test_safe_url_rejects_javascript():
    assert _safe_url("javascript:alert(1)") == "#"


def test_safe_url_rejects_empty():
    assert _safe_url("") == "#"


# ---------------------------------------------------------------------------
# _rank_jobs
# ---------------------------------------------------------------------------

def test_rank_jobs_places_keyword_match_first():
    jobs = [
        {"title": "Accountant", "company": "Acme", "location": "Vienna", "salary_range": ""},
        {"title": "Python Developer", "company": "Tech", "location": "Berlin", "salary_range": "50k"},
    ]
    ranked = _rank_jobs(jobs, keywords="python developer", location="Berlin")

    assert ranked[0]["title"] == "Python Developer"


def test_rank_jobs_scores_salary_and_location():
    jobs = [
        {"title": "Engineer", "company": "A", "location": "Vienna", "salary_range": "60k"},
        {"title": "Engineer", "company": "B", "location": "Remote", "salary_range": ""},
    ]
    ranked = _rank_jobs(jobs, keywords="engineer", location="Vienna")

    # First job has salary (+2) and location match (+2) = higher score
    assert ranked[0]["company"] == "A"


def test_rank_jobs_returns_all_items():
    jobs = [{"title": f"Job {i}", "company": "X", "location": "", "salary_range": ""} for i in range(5)]
    assert len(_rank_jobs(jobs, keywords="anything", location="")) == 5


# ---------------------------------------------------------------------------
# send_transactional_email — provider priority
# ---------------------------------------------------------------------------

def test_send_uses_brevo_first():
    with patch("app.services.email_service._send_via_brevo", return_value=True) as mock_brevo, \
         patch("app.services.email_service._send_via_smtp", return_value=True) as mock_smtp:
        result = send_transactional_email("to@example.com", "Subject", html_body="<p>hi</p>")

    assert result is True
    mock_brevo.assert_called_once()
    mock_smtp.assert_not_called()


def test_send_falls_back_to_smtp_when_brevo_fails():
    with patch("app.services.email_service._send_via_brevo", return_value=False), \
         patch("app.services.email_service._send_via_smtp", return_value=True) as mock_smtp:
        result = send_transactional_email("to@example.com", "Subject", html_body="<p>hi</p>")

    assert result is True
    mock_smtp.assert_called_once()


def test_send_returns_false_when_all_providers_fail():
    with patch("app.services.email_service._send_via_brevo", return_value=False), \
         patch("app.services.email_service._send_via_smtp", return_value=False):
        result = send_transactional_email("to@example.com", "Subject", html_body="<p>hi</p>")

    assert result is False
