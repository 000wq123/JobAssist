"""Pydantic schemas for the CV library sync endpoints.

The entry shape mirrors the frontend's `cv_library_v1` snapshots:
`{ id, name, templateId, createdAt, profile }`. `profile` is an opaque
dict owned by the frontend CV builder, so only its container fields are
validated here.
"""

from typing import Optional

from pydantic import BaseModel, Field


class CvLibraryEntryIn(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = Field(..., min_length=1, max_length=32)
    name: str = Field(default="Lebenslauf", max_length=255)
    templateId: Optional[str] = Field(default=None, max_length=50)
    createdAt: Optional[str] = Field(default=None, max_length=40)
    profile: dict = Field(default_factory=dict)


class CvLibraryPut(BaseModel):
    entries: list[CvLibraryEntryIn] = Field(default_factory=list, max_length=10)


class CvLibraryEntryOut(BaseModel):
    id: str
    name: str
    templateId: Optional[str] = None
    createdAt: Optional[str] = None
    profile: dict


class CvLibraryOut(BaseModel):
    entries: list[CvLibraryEntryOut]
