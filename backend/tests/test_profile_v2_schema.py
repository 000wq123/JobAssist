"""ProfileV2Update date coercion + German request-validation responses.

The CV builder clears the date-of-birth field to "" (and Pydantic would reject
that with an English "Input should be a valid date..." error), and validation
errors must never leak English framework text into the German UI.
"""
from datetime import date

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.main import validation_exception_handler
from app.schemas.profile_v2 import ProfileV2Update


def test_geburtsdatum_empty_string_is_unset():
    model = ProfileV2Update(geburtsdatum="")
    assert model.geburtsdatum is None


def test_geburtsdatum_missing_is_unset():
    model = ProfileV2Update(vorname="Anna")
    assert model.geburtsdatum is None


def test_geburtsdatum_parses_iso_date():
    model = ProfileV2Update(geburtsdatum="1998-05-03")
    assert model.geburtsdatum == date(1998, 5, 3)


def test_cv_design_preferences_are_validated():
    model = ProfileV2Update(accentColor="#1C3557", fontFamily="serif", showPhoto=False)
    assert model.accentColor == "#1C3557"
    assert model.fontFamily == "serif"
    assert model.showPhoto is False


def test_validation_errors_are_german_and_single_string():
    app = FastAPI()

    @app.get("/probe")
    async def probe(q: int):  # noqa: ARG001 - probe endpoint for validation
        return {"ok": True}

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    client = TestClient(app)

    res = client.get("/probe?q=abc")
    assert res.status_code == 422
    body = res.json()
    # A single German string, not Pydantic's English error array — this is the
    # shape the frontend's ApiError normalization already displays verbatim.
    assert isinstance(body["detail"], str)
    assert "Bitte prüfe" in body["detail"]
    assert "valid" not in body["detail"].lower()
