import pytest

from app.services.email_service import _mask_email


def test_mask_email_basic():
    assert _mask_email("a@example.com").endswith("@example.com")
    assert _mask_email("ab@example.com").startswith("a*")
    assert _mask_email("abc@example.com").startswith("a*")


def test_mask_email_preserves_domain():
    masked = _mask_email("user.name+tag@sub.example.co.uk")
    assert masked.endswith("@sub.example.co.uk")


def test_mask_email_handles_invalid():
    assert _mask_email("") == "***"
    assert _mask_email("no-at-sign") == "***"
