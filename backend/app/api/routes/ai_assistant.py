import asyncio
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from groq import AsyncGroq as _AsyncGroq
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings as _settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage, check_usage_limit, increment_usage
from app.models.user import User
from app.models.resume import Resume
from app.services.claude_service import call_groq_async, MODEL as _MODEL
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
_async_groq_client: _AsyncGroq | None = None

# Maximum seconds for a single streaming response (connect + all chunks).
_STREAM_TIMEOUT_S = 90.0


def _get_async_groq_client() -> _AsyncGroq:
    global _async_groq_client
    if _async_groq_client is None:
        _async_groq_client = _AsyncGroq(api_key=_settings.GROQ_API_KEY)
    return _async_groq_client


# ── Injection sanitiser ──────────────────────────────────────────────────────

_INJECTION_RE = re.compile(
    r"(?i)"
    r"(ignore|forget|disregard|override)\s.{0,40}(previous|above|prior|all)\s.{0,40}"
    r"(instructions?|prompts?|rules?|context|system)|"
    r"(system\s*:|\[system\]|<system>|new\s+instruction|jailbreak)",
    re.DOTALL,
)


def _sanitize(text: str, max_len: int) -> str:
    """Strip obvious prompt-injection patterns from user-supplied context."""
    cleaned = _INJECTION_RE.sub("[entfernt]", text)
    return cleaned[:max_len]


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=5000)


class AssistantChatRequest(BaseModel):
    message: str = Field(..., max_length=5000)
    history: List[ChatMessage] = []
    resume_id: Optional[int] = None
    context: str = Field("", max_length=2000)


class AssistantChatResponse(BaseModel):
    reply: str


class JobAnalyzeRequest(BaseModel):
    title: str = Field(..., max_length=300)
    company: str = Field("", max_length=200)
    description: str = Field(..., max_length=10000)
    location: str = Field("", max_length=200)


class JobAnalyzeResponse(BaseModel):
    requirements: List[str]
    nice_to_have: List[str]
    what_to_expect: str
    tips: List[str]


# ── Shared system prompt ──────────────────────────────────────────────────────

_JOBASSIST_SYSTEM = (
    "Du bist JobAssist – ein smarter, humorvoller KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt. "
    "Du hilfst Benutzern bei allen Fragen rund um Bewerbungen in Österreich: "
    "Lebenslauf-Optimierung, Motivationsschreiben, Vorstellungsgespräch-Vorbereitung, "
    "Gehaltsverhandlung, Praktikum- und Samstagsjob-Suche, und allgemeine Karrieretipps. "
    "Du antwortest immer auf Deutsch und kennst die österreichischen Bewerbungsstandards. "
    "Sei freundlich, konkret und hilfsbereit. Gib praxisnahe Tipps. "
    "Du darfst gelegentlich einen leichten, professionellen Humor einsetzen – ein Augenzwinkern hier und da lockert die Atmosphäre. "
    "WICHTIG: Nenne niemals andere Job-Plattformen, Karriereportale oder Konkurrenzprodukte "
    "(z.B. LinkedIn, Indeed, StepStone, karriere.at, Monster, Xing oder ähnliche). "
    "Wenn du eine Plattform empfiehlst, empfiehlst du ausschließlich JobAssist. "
    "Weise aktiv auf die Funktionen von JobAssist hin, wenn sie zur Frage passen: "
    "KI-Lebenslaufanalyse, automatische Anschreiben-Erstellung, Job-Matching, Bewerbungsfortschritt-Tracking, "
    "Interview-Simulator und Gehaltsvergleiche – alles direkt in JobAssist verfügbar. "
    "Du bist ein KI-Assistent. Wenn dich jemand fragt, ob du ein Mensch oder eine KI bist, antworte ehrlich, dass du ein KI-Assistent bist."
)


def _build_user_message(message: str, resume_text: str = "", extra_context: str = "") -> str:
    """Prepend sanitised context to the user message — never inject into system role."""
    parts = []
    if resume_text:
        parts.append(f"[Mein Lebenslauf (Kontext):\n{resume_text}]")
    if extra_context:
        parts.append(f"[Zusätzlicher Kontext:\n{extra_context}]")
    parts.append(message)
    return "\n\n".join(parts)


router = APIRouter()


# ── /analyze-job ─────────────────────────────────────────────────────────────

@router.post("/analyze-job", response_model=JobAnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_job(
    request: Request,
    payload: JobAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
) -> JobAnalyzeResponse:
    import json
    system = (
        "Du bist ein erfahrener österreichischer Karriereberater. "
        "Analysiere Stellenanzeigen präzise und antworte ausschließlich mit gültigem JSON — kein Markdown, keine Code-Blöcke."
    )
    prompt = f"""Analysiere diese Stelle und gib ein JSON-Objekt mit genau diesen Schlüsseln zurück:
- "requirements": Array mit 4-6 konkreten Muss-Anforderungen (Kenntnisse, Abschlüsse, Erfahrungen)
- "nice_to_have": Array mit 3-4 Kann-Anforderungen / Vorteilen
- "what_to_expect": String, 2-3 Sätze was Bewerber in dieser Rolle tatsächlich tun werden
- "tips": Array mit 3 konkreten Bewerbungstipps speziell für diese Stelle

Stelle: {payload.title}
Unternehmen: {payload.company or 'Unbekannt'}
Ort: {payload.location or 'Österreich'}
Beschreibung:
\"\"\"
{payload.description[:2000]}
\"\"\"
"""
    result = await call_groq_async(prompt, system=system, max_tokens=1024)
    try:
        parsed = json.loads(result)
        return JobAnalyzeResponse(
            requirements=parsed.get("requirements", []),
            nice_to_have=parsed.get("nice_to_have", []),
            what_to_expect=parsed.get("what_to_expect", ""),
            tips=parsed.get("tips", []),
        )
    except json.JSONDecodeError:
        return JobAnalyzeResponse(requirements=[], nice_to_have=[], what_to_expect=result, tips=[])


# ── /chat ────────────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    text: str = Field(..., max_length=10000)
    type: str = Field("lebenslauf", max_length=30)
    job_description: str = Field("", max_length=10000)


class OptimizeResponse(BaseModel):
    optimized: str
    suggestions: List[str]


@router.post("/chat", response_model=AssistantChatResponse)
@limiter.limit("20/minute")
async def chat(
    request: Request,
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
) -> AssistantChatResponse:
    resume_text = ""
    if payload.resume_id:
        result = await db.execute(
            select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        )
        resume = result.scalar_one_or_none()
        if resume and resume.raw_text:
            resume_text = _sanitize(resume.raw_text[:2000], 2000)

    extra_context = _sanitize(payload.context, 1000) if payload.context else ""

    # User context is placed in the USER message — never concatenated into the system role.
    messages = [{"role": "system", "content": _JOBASSIST_SYSTEM}]
    for msg in payload.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    user_content = _build_user_message(payload.message, resume_text, extra_context)
    messages.append({"role": "user", "content": user_content})

    # Build a single prompt string from the messages for call_groq_async
    parts = []
    for m in messages[1:]:  # skip system — passed separately
        label = "Benutzer" if m["role"] == "user" else "Assistent"
        parts.append(f"{label}: {m['content']}")
    prompt = "\n\n".join(parts)

    reply = await call_groq_async(prompt, system=_JOBASSIST_SYSTEM, max_tokens=1024, temperature=0.5)
    return AssistantChatResponse(reply=reply)


# ── /chat-stream ──────────────────────────────────────────────────────────────

@router.post("/chat-stream")
@limiter.limit("20/minute")
async def chat_stream(
    request: Request,
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage_info=Depends(check_usage_limit("ai_chat")),  # check-only; increment deferred
) -> StreamingResponse:
    import json as _json

    resume_text = ""
    if payload.resume_id:
        result = await db.execute(
            select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        )
        resume = result.scalar_one_or_none()
        if resume and resume.raw_text:
            resume_text = _sanitize(resume.raw_text[:2000], 2000)

    extra_context = _sanitize(payload.context, 1000) if payload.context else ""

    # User context in user message — not in system role.
    messages = [{"role": "system", "content": _JOBASSIST_SYSTEM}]
    for msg in payload.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    user_content = _build_user_message(payload.message, resume_text, extra_context)
    messages.append({"role": "user", "content": user_content})

    # Unpack the check-only dependency result (db session + identity for the deferred commit)
    usage_db, usage_user_id, usage_feature = _usage_info

    async def generate():
        groq_client = _get_async_groq_client()
        usage_committed = False
        deadline = asyncio.get_event_loop().time() + _STREAM_TIMEOUT_S

        try:
            # Timeout the initial connection separately so a stall at connect time
            # doesn't block a thread waiting indefinitely.
            stream = await asyncio.wait_for(
                groq_client.chat.completions.create(
                    model=_MODEL,
                    messages=messages,
                    max_tokens=1024,
                    temperature=0.5,
                    stream=True,
                ),
                timeout=15.0,
            )

            async for chunk in stream:
                # Abort if the client disconnected — stops consuming Groq tokens.
                if await request.is_disconnected():
                    logger.info("chat_stream: client disconnected, aborting generator")
                    return

                # Hard deadline guards against stalled streams that never error.
                if asyncio.get_event_loop().time() > deadline:
                    logger.warning("chat_stream: exceeded %ss deadline", _STREAM_TIMEOUT_S)
                    yield f"data: {_json.dumps({'error': 'Request timed out. Please try again.'})}\n\n"
                    return

                content = chunk.choices[0].delta.content
                if content:
                    # Commit usage only after the first real chunk — if Groq never
                    # delivers data, the user is not charged.
                    if not usage_committed:
                        await increment_usage(usage_db, usage_user_id, usage_feature)
                        usage_committed = True
                    yield f"data: {_json.dumps({'text': content})}\n\n"

        except asyncio.TimeoutError:
            logger.warning("chat_stream: Groq connection timed out")
            yield f"data: {_json.dumps({'error': 'Verbindungszeitüberschreitung. Bitte versuche es erneut.'})}\n\n"
        except Exception as e:
            logger.error("chat_stream error: %s", e, exc_info=True)
            yield f"data: {_json.dumps({'error': 'AI service temporarily unavailable. Please try again.'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── /optimize ─────────────────────────────────────────────────────────────────

@router.post("/optimize", response_model=OptimizeResponse)
@limiter.limit("10/minute")
async def optimize(
    request: Request,
    payload: OptimizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
) -> OptimizeResponse:
    type_labels = {
        "lebenslauf": "Lebenslauf-Abschnitt",
        "motivationsschreiben": "Motivationsschreiben",
        "profil": "Profil/Zusammenfassung",
    }
    type_label = type_labels.get(payload.type, "Text")

    job_context = ""
    if payload.job_description:
        job_context = f"\n\nStellenbeschreibung (Ziel):\n{payload.job_description}"

    system = (
        "Du bist ein erfahrener Bewerbungscoach in Österreich. "
        "Optimiere den folgenden Text für den österreichischen Arbeitsmarkt. "
        "Antworte immer auf Deutsch. Gib den optimierten Text und 3-5 konkrete "
        "Verbesserungsvorschläge als JSON zurück."
    )

    prompt = f"""Optimiere den folgenden {type_label} für eine Bewerbung in Österreich.{job_context}

Text:
\"\"\"
{payload.text}
\"\"\"

Antworte als JSON mit genau diesen Schlüsseln:
- "optimized": der verbesserte Text
- "suggestions": Array mit 3-5 konkreten Verbesserungstipps (auf Deutsch)

Nur JSON, keine Erklärung.
"""

    import json
    result = await call_groq_async(prompt, system=system, max_tokens=2048)
    try:
        parsed = json.loads(result)
        return OptimizeResponse(
            optimized=parsed.get("optimized", payload.text),
            suggestions=parsed.get("suggestions", []),
        )
    except json.JSONDecodeError:
        return OptimizeResponse(
            optimized=result,
            suggestions=["Der Text wurde optimiert, konnte aber nicht als JSON geparst werden."],
        )
