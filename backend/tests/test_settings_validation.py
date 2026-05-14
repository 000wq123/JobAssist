import pytest
from pydantic import ValidationError

from app.schemas.user import UserPreferencesUpdate
from app.schemas.user_profile import UserProfileUpdate


def test_user_preferences_normalize_valid_values():
    payload = UserPreferencesUpdate(currency=" eur ", location=" Vienna ", language="DE")

    assert payload.currency == "EUR"
    assert payload.location == "Vienna"
    assert payload.language == "de"


@pytest.mark.parametrize(
    "payload",
    [
        {"currency": "EURO"},
        {"currency": "12"},
        {"location": "   "},
        {"location": "x" * 121},
        {"language": "fr"},
    ],
)
def test_user_preferences_reject_invalid_values(payload):
    with pytest.raises(ValidationError):
        UserPreferencesUpdate(**payload)


def test_user_profile_rejects_invalid_salary_range():
    with pytest.raises(ValidationError):
        UserProfileUpdate(salary_min=90, salary_max=50)


def test_user_profile_rejects_invalid_avatar():
    with pytest.raises(ValidationError):
        UserProfileUpdate(avatar="data:text/plain;base64,Zm9v")
