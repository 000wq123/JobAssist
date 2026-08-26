from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.api.routes import profile as profile_module
from app.schemas.cv_library import CvLibraryEntryIn, CvLibraryPut


def _row(
    entry_id: str = "abc123",
    name: str = "Lebenslauf",
    template: str | None = "tabellarisch",
    created: str | None = "2026-01-01T00:00:00Z",
    profile: dict | None = None,
):
    return SimpleNamespace(
        entry_id=entry_id,
        name=name,
        template_id=template,
        created_at_client=created,
        profile=profile or {"vorname": "Lisa", "nachname": "Muster"},
    )


@pytest.mark.asyncio
async def test_get_cv_library_returns_entries_in_insertion_order():
    rows = [
        _row("a", "Eins"),
        _row("b", "Zwei", created="2026-01-02T00:00:00Z"),
    ]
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: rows))
    )
    current_user = SimpleNamespace(id=5)

    result = await profile_module.get_cv_library(db=db, current_user=current_user)

    assert [e.id for e in result.entries] == ["a", "b"]
    assert result.entries[0].name == "Eins"
    assert result.entries[0].templateId == "tabellarisch"
    assert result.entries[0].createdAt == "2026-01-01T00:00:00Z"
    assert result.entries[0].profile == {"vorname": "Lisa", "nachname": "Muster"}
    # Only rows for the current user are queried.
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_put_cv_library_replaces_all_rows_and_commits():
    payload = CvLibraryPut(
        entries=[
            CvLibraryEntryIn(
                id="a",
                name="Eins",
                templateId="tabellarisch",
                createdAt="2026-01-01T00:00:00Z",
                profile={"vorname": "Lisa"},
            ),
            CvLibraryEntryIn(id="b", name="Zwei", profile={"vorname": "Max"}),
        ]
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    current_user = SimpleNamespace(id=5)

    result = await profile_module.put_cv_library(payload=payload, db=db, current_user=current_user)

    # One delete-all for the user + no extra reads; one insert per entry.
    assert db.execute.await_count == 1
    assert db.add.call_count == 2
    db.commit.assert_awaited_once()
    assert [e.id for e in result.entries] == ["a", "b"]
    assert result.entries[1].name == "Zwei"
    assert result.entries[1].templateId is None


def test_cv_library_put_rejects_more_than_10_entries():
    with pytest.raises(ValidationError):
        CvLibraryPut(entries=[CvLibraryEntryIn(id=f"e{i}", name="x") for i in range(11)])


def test_cv_library_put_allows_up_to_10_entries():
    payload = CvLibraryPut(entries=[CvLibraryEntryIn(id=f"e{i}", name="x") for i in range(10)])
    assert len(payload.entries) == 10
