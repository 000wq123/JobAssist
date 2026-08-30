import asyncio
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from app.core.rate_limit import limiter
from app.services.email_service import send_transactional_email

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPORT_EMAIL = "hallo@jobassist.tech"


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

    # Sanitize: no HTML injection, no newlines in single-line fields.
    def one_line(s: str) -> str:
        return " ".join(s.replace("\r", " ").replace("\n", " ").split())

    safe_name = one_line(payload.name)[:200]
    safe_topic = one_line(payload.topic)[:200]
    safe_email = str(payload.email)
    safe_message = payload.message.strip()[:5000]

    subject = f"JobAssist: Kontaktanfrage - {safe_topic}"

    html_body = f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Kontaktanfrage</title>
</head>
<body style="margin:0;padding:0;background-color:#F2F1ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F1ED;padding:32px 16px;">
    <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- Logo row -->
      <tr>
        <td style="padding:0 0 18px;">
          <span style="display:inline-block;background:#E30613;border-radius:8px;width:32px;height:32px;text-align:center;line-height:32px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">JA</span>
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:16px;font-weight:800;color:#171717;letter-spacing:-0.2px;">JobAssist</span>
        </td>
      </tr>

      <!-- Paper card -->
      <tr>
        <td style="background:#FDFCF9;border:1px solid #E8E8E4;border-radius:16px;padding:36px 38px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E30613;">Kontaktanfrage</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#171717;letter-spacing:-0.3px;">{safe_topic}</h1>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#5A5A5A;width:90px;">Name</td>
              <td style="padding:6px 0;font-size:13px;color:#171717;font-weight:600;">{safe_name}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#5A5A5A;">E-Mail</td>
              <td style="padding:6px 0;font-size:13px;"><a href="mailto:{safe_email}" style="color:#E30613;text-decoration:underline;">{safe_email}</a></td>
            </tr>
          </table>

          <div style="background:#FFFFFF;border:1px solid #E8E8E4;border-radius:12px;padding:18px 20px;">
            <p style="margin:0;font-size:13.5px;color:#171717;line-height:1.65;white-space:pre-wrap;">{safe_message}</p>
          </div>

          <p style="margin:18px 0 0;font-size:12px;color:#9A9A94;line-height:1.6;">
            Antwort direkt an den Absender (Reply-To ist gesetzt).
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:22px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="color:#9A9A94;font-size:11px;line-height:1.7;">
                <span style="font-weight:700;color:#5A5A5A;">JobAssist</span> &nbsp;&middot;&nbsp; jobassist.tech<br>
                Interne Benachrichtigung &nbsp;<span style="color:#9A9A94;">&#169; 2025&#8211;2026</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>
</body>
</html>"""

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
