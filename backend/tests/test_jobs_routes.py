"""Unit tests for app.api.routes.jobs.

DB is mocked — no real database required.
"""
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from starlette.responses import JSONResponse, Response

from app.api.routes import jobs as jobs_route
from app.schemas.job import (
    JobCreate,
    JobDeadlineUpdate,
    JobNotesUpdate,
    JobResearchUpdate,
    JobStatusUpdate,
    JobUrlUpdate,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, scalars=None, scalar=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._scalars = scalars or []
        # `scalar` is used by COUNT queries (returns the row count). If not
        # provided, default to 0 so route handlers see "no rows yet".
        self._scalar = scalar if scalar is not None else 0

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalar(self):
        return self._scalar

    def scalars(self):
        return SimpleNamespace(all=lambda: self._scalars)


def _make_job(**kwargs):
    defaults = dict(
        id=1, user_id=1, company="Acme", role="Dev",
        description="Job desc", url="https://example.com/job/1",
        status="bookmarked", match_score=None, match_feedback=None,
        cover_letter=None, interview_qa=None, research_data=None,
        notes=None, deadline=None, applied_at=None,
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _make_user(id=1):
    return SimpleNamespace(id=id, email="user@example.com")


# ---------------------------------------------------------------------------
# create_job
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_job_saves_new_job():
    db = AsyncMock()
    db.add = MagicMock()
    # No existing job for URL dedup check
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))

    db.refresh = AsyncMock(side_effect=lambda obj: None)

    # Capture the Job instance added to session
    added = []
    def capture_add(obj):
        added.append(obj)
        obj.id = 1
    db.add.side_effect = capture_add

    payload = JobCreate(
        company="Acme",
        role="Dev",
        description="Job desc",
        url="https://example.com/job/1",
    )

    # Return the captured object from refresh
    async def fake_refresh(obj):
        obj.status = "bookmarked"
        obj.match_score = None
        obj.match_feedback = None
        obj.cover_letter = None
        obj.interview_qa = None
        obj.research_data = None
        obj.notes = None
        obj.deadline = None
        obj.created_at = "2026-01-01T00:00:00Z"
        obj.updated_at = "2026-01-01T00:00:00Z"

    db.refresh = AsyncMock(side_effect=fake_refresh)

    await jobs_route.create_job(
        request=SimpleNamespace(),
        payload=payload,
        db=db,
        current_user=_make_user(),
    )

    assert len(added) == 1
    assert added[0].company == "Acme"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_job_returns_existing_on_duplicate_url():
    existing = _make_job(id=99, url="https://example.com/job/1")
    db = AsyncMock()
    # First execute: resume check (no resume_id), second: URL dedup returns existing
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=existing))

    payload = JobCreate(
        company="Acme",
        role="Dev",
        description="Job desc",
        url="https://example.com/job/1",
    )

    result = await jobs_route.create_job(
        request=SimpleNamespace(),
        payload=payload,
        db=db,
        current_user=_make_user(),
    )

    # Duplicate-URL path returns a 200 JSONResponse wrapping the existing job.
    from starlette.responses import JSONResponse

    assert isinstance(result, JSONResponse)
    assert result.status_code == 200
    body = json.loads(result.body.decode())
    assert body["id"] == 99
    db.add.assert_not_called()
    db.commit.assert_not_called()


# ---------------------------------------------------------------------------
# list_jobs — ETag revalidation (304 path)
# ---------------------------------------------------------------------------

def _make_request(if_none_match=None):
    headers = {}
    if if_none_match is not None:
        headers["if-none-match"] = if_none_match
    return SimpleNamespace(headers=headers)


@pytest.mark.asyncio
async def test_list_jobs_returns_200_with_etag_header():
    job = _make_job()
    db = AsyncMock()
    # Each list_jobs call runs COUNT then SELECT; alternate results forever.
    db.execute = AsyncMock(
        side_effect=lambda *a, **k: FakeResult(scalar=1)
        if db.execute.call_count % 2
        else FakeResult(scalars=[job])
    )

    response = await jobs_route.list_jobs(
        request=_make_request(),
        page=1,
        page_size=20,
        status=None,
        db=db,
        current_user=_make_user(),
    )

    assert isinstance(response, JSONResponse)
    assert response.status_code == 200
    etag = response.headers["etag"]
    assert etag.startswith('W/"')
    body = json.loads(response.body.decode())
    assert body["total"] == 1
    assert body["items"][0]["id"] == 1


@pytest.mark.asyncio
async def test_list_jobs_returns_304_on_matching_etag():
    """Regression: the 304 branch previously referenced an unimported
    `Response` symbol and raised NameError whenever a client revalidated
    with a matching If-None-Match header."""
    job = _make_job()
    db = AsyncMock()
    # Two route calls x (COUNT + SELECT) each — alternate results forever.
    db.execute = AsyncMock(
        side_effect=lambda *a, **k: FakeResult(scalar=1)
        if db.execute.call_count % 2
        else FakeResult(scalars=[job])
    )

    # First call: learn the ETag the route computes for this payload.
    first = await jobs_route.list_jobs(
        request=_make_request(),
        page=1,
        page_size=20,
        status=None,
        db=db,
        current_user=_make_user(),
    )
    etag = first.headers["etag"]

    # Second call: same data, client sends the ETag back → must be a 304.
    second = await jobs_route.list_jobs(
        request=_make_request(if_none_match=etag),
        page=1,
        page_size=20,
        status=None,
        db=db,
        current_user=_make_user(),
    )

    assert isinstance(second, Response)
    assert second.status_code == 304
    assert second.headers["etag"] == etag
    assert second.body == b""


# ---------------------------------------------------------------------------
# update_job_status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_status_to_applied():
    job = _make_job(status="bookmarked")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=job))
    db.refresh = AsyncMock(side_effect=lambda obj: None)

    await jobs_route.update_job_status(
        request=SimpleNamespace(),
        job_id=1,
        payload=JobStatusUpdate(status="applied"),
        db=db,
        current_user=_make_user(),
    )

    assert job.status == "applied"
    db.commit.assert_awaited_once()


def test_update_status_rejects_invalid_value():
    # Invalid values are rejected by Pydantic at schema construction time
    # (status is a Literal[...]), so the route is never reached.
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        JobStatusUpdate(status="won_lottery")


@pytest.mark.asyncio
async def test_update_status_404_for_unknown_job():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))

    with pytest.raises(HTTPException) as exc:
        await jobs_route.update_job_status(
            request=SimpleNamespace(),
            job_id=999,
            payload=JobStatusUpdate(status="applied"),
            db=db,
            current_user=_make_user(),
        )

    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# update_job_notes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_notes_saves_text():
    job = _make_job(notes=None)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=job))
    db.refresh = AsyncMock(side_effect=lambda obj: None)

    await jobs_route.update_job_notes(
        request=SimpleNamespace(),
        job_id=1,
        payload=JobNotesUpdate(notes="Call HR on Monday"),
        db=db,
        current_user=_make_user(),
    )

    assert job.notes == "Call HR on Monday"
    db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# update_job_deadline / update_job_url
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_deadline_saves_timestamp():
    job = _make_job(deadline=None)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=job))
    db.refresh = AsyncMock(side_effect=lambda obj: None)
    deadline = datetime(2026, 9, 15, tzinfo=timezone.utc)

    await jobs_route.update_job_deadline(
        request=SimpleNamespace(),
        job_id=1,
        payload=JobDeadlineUpdate(deadline=deadline),
        db=db,
        current_user=_make_user(),
    )

    assert job.deadline == deadline
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_url_saves_original_link():
    job = _make_job(url="https://example.com/old")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=job))
    db.refresh = AsyncMock(side_effect=lambda obj: None)

    await jobs_route.update_job_url(
        request=SimpleNamespace(),
        job_id=1,
        payload=JobUrlUpdate(url="https://example.com/new"),
        db=db,
        current_user=_make_user(),
    )

    assert job.url == "https://example.com/new"
    db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# delete_job
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_job_removes_record():
    job = _make_job()
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=job))

    await jobs_route.delete_job(
        request=SimpleNamespace(),
        job_id=1,
        db=db,
        current_user=_make_user(),
    )

    db.delete.assert_awaited_once_with(job)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_job_404_for_unknown():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=None))

    with pytest.raises(HTTPException) as exc:
        await jobs_route.delete_job(
            request=SimpleNamespace(),
            job_id=999,
            db=db,
            current_user=_make_user(),
        )

    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# JobResearchUpdate schema — JSON validation
# ---------------------------------------------------------------------------

def test_research_update_accepts_valid_json():
    data = json.dumps({"summary": "Good company", "hot_topics": []})
    payload = JobResearchUpdate(research_data=data)
    assert payload.research_data == data


def test_research_update_rejects_invalid_json():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        JobResearchUpdate(research_data="{not valid json{{")


def test_research_update_accepts_none():
    payload = JobResearchUpdate(research_data=None)
    assert payload.research_data is None
