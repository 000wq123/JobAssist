"""Motivationsschreiben routes — removed in v1. All endpoints return 410 Gone."""
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.post("/generate")
@router.post("/")
async def gone(request: Request):
    raise HTTPException(status_code=410, detail="Motivationsschreiben wurde in v1 entfernt.")
