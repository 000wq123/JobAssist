import asyncio
import html as _html
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from app.core.rate_limit import limiter
from app.services.email_service import send_transactional_email

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPORT_EMAIL = "jobassistsupport@gmail.com"


class ContactRequest(BaseModel):
    name: str = Field(..., max_length=200)
    email: EmailStr
    topic: str = Field(..., max_length=200)
    message: str = Field(..., max_length=5000)


@router.post("/send", status_code=200)
@limiter.limit("5/minute")
async def send_contact(request: Request, payload: ContactRequest) -> dict[str, str]:
    if len(payload.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Nachricht zu kurz")

    safe_name = _html.escape(payload.name).replace("\n", "").replace("\r", "")
    safe_email = _html.escape(str(payload.email))
    safe_topic = _html.escape(payload.topic).replace("\n", "").replace("\r", "")
    safe_message = _html.escape(payload.message)

    subject = f"[JobAssist Kontakt] {safe_topic[:80]} – {safe_name[:80]}"
    html_body = f"""
    <html><body style="font-family:sans-serif;color:#1e293b;padding:24px;">
      <h2 style="margin-bottom:4px;">Neue Kontaktanfrage</h2>
      <p style="color:#64748b;margin-top:0;">über jobassist.tech</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;margin:16px 0;">
        <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;width:120px;">Name</td><td style="padding:8px 12px;">{safe_name}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;">E-Mail</td><td style="padding:8px 12px;"><a href="mailto:{safe_email}">{safe_email}</a></td></tr>
        <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Thema</td><td style="padding:8px 12px;">{safe_topic}</td></tr>
      </table>
      <div style="background:#f8fafc;border-left:3px solid #6366f1;padding:16px;border-radius:4px;max-width:600px;">
        <p style="margin:0;white-space:pre-wrap;">{safe_message}</p>
      </div>
    </body></html>
    """
    try:
        await asyncio.to_thread(
            send_transactional_email,
            to_email=SUPPORT_EMAIL,
            subject=subject,
            html_body=html_body,
            reply_to=payload.email,
        )
    except Exception as e:
        logger.error("Contact form email failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.")

    return {"message": "Nachricht erfolgreich gesendet"}
