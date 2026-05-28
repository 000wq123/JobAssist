"""AI Assistant routes — removed in v1. All endpoints return 410 Gone."""
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()

_GONE = {"detail": "KI-Assistent wurde in v1 entfernt."}


@router.post("/chat")
@router.post("/chat/stream")
@router.get("/history/{job_id}")
@router.delete("/history/{job_id}")
async def gone(request: Request):
    raise HTTPException(status_code=410, detail=_GONE["detail"])
