from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.services.claude_service import polish_text

router = APIRouter()


class PolishRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    context: str = Field("", max_length=400)


class PolishResponse(BaseModel):
    text: str


@router.post("/polish", response_model=PolishResponse)
@limiter.limit("30/minute")
async def polish(
    request: Request,
    payload: PolishRequest,
    current_user: User = Depends(get_current_user),
) -> PolishResponse:
    """Improve a short CV text snippet (hobbies line, job bullet, etc.)."""
    improved = await polish_text(payload.text.strip(), payload.context)
    return PolishResponse(text=improved)
