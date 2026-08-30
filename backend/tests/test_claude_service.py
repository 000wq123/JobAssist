"""Unit tests for app.services.claude_service.

All tests mock the Groq client so no real API calls are made.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(content: str):
    """Build a minimal fake Groq chat-completion response."""
    choice = SimpleNamespace(message=SimpleNamespace(content=content))
    return SimpleNamespace(choices=[choice])


# ---------------------------------------------------------------------------
# _strip_code_fences
# ---------------------------------------------------------------------------

def test_strip_code_fences_removes_json_wrapper():
    from app.services.claude_service import _strip_code_fences

    assert _strip_code_fences("```json\n{}\n```") == "{}"


def test_strip_code_fences_removes_plain_wrapper():
    from app.services.claude_service import _strip_code_fences

    assert _strip_code_fences("```\nhello\n```") == "hello"


def test_strip_code_fences_noop_on_plain_text():
    from app.services.claude_service import _strip_code_fences

    assert _strip_code_fences("plain text") == "plain text"


# ---------------------------------------------------------------------------
# _call_groq — happy path
# ---------------------------------------------------------------------------

def test_call_groq_returns_content_on_success():
    from app.services.claude_service import _call_groq

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = _make_response("hello")

    with patch("app.services.claude_service.client", fake_client):
        result = _call_groq("test prompt")

    assert result == "hello"
    assert fake_client.chat.completions.create.call_count == 1


# ---------------------------------------------------------------------------
# _call_groq — rate-limit fallback
# ---------------------------------------------------------------------------

def test_call_groq_falls_back_to_fallback_model_on_rate_limit():
    from app.services.claude_service import _call_groq, MODEL, MODEL_FALLBACK

    call_count = {"n": 0}

    def fake_create(**kwargs):
        call_count["n"] += 1
        if kwargs["model"] == MODEL:
            raise Exception("rate limit exceeded 429")
        return _make_response("fallback ok")

    fake_client = MagicMock()
    fake_client.chat.completions.create.side_effect = fake_create

    with patch("app.services.claude_service.client", fake_client), \
         patch("app.services.claude_service.time") as mock_time:
        mock_time.sleep = MagicMock()
        result = _call_groq("prompt")

    assert result == "fallback ok"
    # Primary model tried twice (attempt 0 + 1), then fallback used
    models_used = [c.kwargs["model"] for c in fake_client.chat.completions.create.call_args_list]
    assert MODEL in models_used
    assert MODEL_FALLBACK in models_used


def test_call_groq_raises_429_when_all_attempts_rate_limited():
    from app.services.claude_service import _call_groq

    fake_client = MagicMock()
    fake_client.chat.completions.create.side_effect = Exception("429 rate limit")

    with patch("app.services.claude_service.client", fake_client), \
         patch("app.services.claude_service.time") as mock_time:
        mock_time.sleep = MagicMock()
        with pytest.raises(HTTPException) as exc:
            _call_groq("prompt")

    assert exc.value.status_code == 429


def test_call_groq_raises_503_on_auth_error():
    from app.services.claude_service import _call_groq

    fake_client = MagicMock()
    fake_client.chat.completions.create.side_effect = Exception("authentication failed 401")

    with patch("app.services.claude_service.client", fake_client), \
         patch("app.services.claude_service.time") as mock_time:
        mock_time.sleep = MagicMock()
        with pytest.raises(HTTPException) as exc:
            _call_groq("prompt")

    assert exc.value.status_code == 503


def test_call_groq_raises_502_on_empty_content():
    from app.services.claude_service import _call_groq

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = _make_response("")

    with patch("app.services.claude_service.client", fake_client):
        with pytest.raises(HTTPException) as exc:
            _call_groq("prompt")

    assert exc.value.status_code == 502


# ---------------------------------------------------------------------------
# Model availability — guards against Groq deprecations
# ---------------------------------------------------------------------------

def test_configured_models_exist_on_groq():
    """The configured primary/fallback models must still be offered by Groq.

    This is the regression test for the cover-letter 500 outage: Groq
    deprecated `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` and every AI
    route started 500ing with a model_not_found error. If Groq ever deprecates
    the current models, this test fails fast instead of production.

    Skipped when GROQ_API_KEY is unset (CI without credentials) or when the
    network is unreachable (offline dev) — an unreachable Groq is an
    environment problem, not a configuration regression.
    """
    import asyncio
    import os

    from app.core.config import settings
    from app.services.claude_service import MODEL, MODEL_FALLBACK

    if not settings.GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY not configured")

    async def _fetch_model_ids() -> set[str] | None:
        from groq import AsyncGroq

        ac = AsyncGroq(api_key=settings.GROQ_API_KEY)
        try:
            models = await asyncio.wait_for(ac.models.list(), timeout=15)
            return {m.id for m in models.data}
        except Exception:
            return None  # network/auth hiccup — treat as inconclusive

    model_ids = asyncio.run(_fetch_model_ids())

    if model_ids is None:
        pytest.skip("Groq API unreachable — cannot verify model availability")

    assert MODEL in model_ids, (
        f"Configured primary model '{MODEL}' is no longer offered by Groq. "
        f"Update MODEL in app/services/claude_service.py. Available: {sorted(model_ids)}"
    )
    assert MODEL_FALLBACK in model_ids, (
        f"Configured fallback model '{MODEL_FALLBACK}' is no longer offered by Groq. "
        f"Update MODEL_FALLBACK in app/services/claude_service.py. Available: {sorted(model_ids)}"
    )


def test_configured_models_are_distinct():
    """Primary and fallback must differ, otherwise the retry schedule is a no-op."""
    from app.services.claude_service import MODEL, MODEL_FALLBACK

    assert MODEL != MODEL_FALLBACK


def test_reasoning_models_get_extra_token_budget():
    """gpt-oss reasoning models need extra max_tokens headroom or they return
    empty content (all budget consumed by reasoning tokens)."""
    from app.services.claude_service import MODEL, _reasoning_overhead

    assert _reasoning_overhead(MODEL) > 0


# ---------------------------------------------------------------------------
# parse_resume
# ---------------------------------------------------------------------------

def test_parse_resume_returns_dict_on_valid_json():
    from app.services.claude_service import parse_resume

    payload = '{"name": "Ada Lovelace", "skills": ["Python"]}'

    with patch("app.services.claude_service._call_groq", return_value=payload):
        result = parse_resume("resume text")

    assert result["name"] == "Ada Lovelace"
    assert "Python" in result["skills"]


def test_parse_resume_returns_raw_on_invalid_json():
    from app.services.claude_service import parse_resume

    with patch("app.services.claude_service._call_groq", return_value="not json {{"):
        result = parse_resume("resume text")

    assert "raw" in result


# ---------------------------------------------------------------------------
# match_resume_to_job — score computation
# ---------------------------------------------------------------------------

def test_match_resume_to_job_computes_score_in_python():
    """Score must be calculated in Python, not taken from LLM output."""
    from app.services.claude_service import match_resume_to_job

    llm_output = """{
        "requirements": [
            {"req": "Python", "score": 2, "note": "Strong"},
            {"req": "SQL",    "score": 2, "note": "Good"},
            {"req": "Docker", "score": 1, "note": "Some"},
            {"req": "CI/CD",  "score": 0, "note": "Missing"},
            {"req": "AWS",    "score": 2, "note": "Strong"},
            {"req": "Agile",  "score": 2, "note": "Yes"}
        ],
        "bonus": 5,
        "penalty": 3,
        "summary": "Good match",
        "strengths": ["Python", "SQL"],
        "gaps": ["CI/CD"],
        "recommendations": ["Learn CI/CD"]
    }"""

    with patch("app.services.claude_service._call_groq", return_value=llm_output):
        result = match_resume_to_job("resume", "job desc")

    # req_total = 2+2+1+0+2+2 = 9 → base = round(9/12*100) = 75
    # + bonus 5 - penalty 3 = 77, clamped to 42–95
    assert result["score"] == 77
    assert result["summary"] == "Good match"
    assert "Python" in result["strengths"]


def test_match_resume_to_job_clamps_score():
    from app.services.claude_service import match_resume_to_job

    # All zeros → base=0, bonus=0, penalty=0 → clamped to 42
    llm_output = """{
        "requirements": [
            {"req": "r1","score":0,"note":""},{"req":"r2","score":0,"note":""},
            {"req": "r3","score":0,"note":""},{"req":"r4","score":0,"note":""},
            {"req": "r5","score":0,"note":""},{"req":"r6","score":0,"note":""}
        ],
        "bonus": 0, "penalty": 0,
        "summary": "Poor", "strengths": [], "gaps": [], "recommendations": []
    }"""

    with patch("app.services.claude_service._call_groq", return_value=llm_output):
        result = match_resume_to_job("resume", "job")

    assert result["score"] == 42


def test_match_resume_to_job_handles_invalid_json():
    from app.services.claude_service import match_resume_to_job

    with patch("app.services.claude_service._call_groq", return_value="broken {{json"):
        result = match_resume_to_job("resume", "job")

    assert result["score"] is None
