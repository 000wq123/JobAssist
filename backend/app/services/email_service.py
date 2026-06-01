import html as html_lib
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def _mask_email(addr: str) -> str:
    try:
        if "@" not in addr:
            return "***"
        local, domain = addr.split("@", 1)
        if not local:
            return f"*@{domain}"
        head = local[0]
        tail = local[-1] if len(local) > 1 else ""
        masked_local = head + ("*" * max(1, len(local) - 2)) + tail
        return f"{masked_local}@{domain}"
    except Exception:
        return "***"

def get_email_provider_status() -> dict:
    brevo_configured = bool(settings.BREVO_API_KEY)
    smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    active_provider = "brevo" if brevo_configured else "smtp" if smtp_configured else None
    return {
        "brevo_configured": brevo_configured,
        "smtp_configured": smtp_configured,
        "active_provider": active_provider,
    }


def _safe_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if parsed.scheme in ("http", "https"):
            return html_lib.escape(url)
    except Exception:
        pass
    return "#"


def _rank_jobs(jobs: List[Dict[str, Any]], keywords: str, location: str) -> List[Dict[str, Any]]:
    """Score and sort jobs by relevance to the alert's keywords and location."""
    kw_terms = {t for t in keywords.lower().split() if len(t) > 2}
    loc_lower = (location or "").lower()
    scored = []
    for job in jobs:
        score = 0
        title = (job.get("title") or "").lower()
        company = job.get("company") or ""
        job_loc = (job.get("location") or "").lower()
        salary = job.get("salary_range") or job.get("salary") or ""
        # Keyword hit in title
        for term in kw_terms:
            if term in title:
                score += 3
        # Salary listed = employer transparency
        if salary:
            score += 2
        # Known company name
        if company and company.lower() not in ("", "unbekannt", "unknown"):
            score += 1
        # Location match
        if loc_lower and loc_lower in job_loc:
            score += 2
        scored.append((score, job))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [j for _, j in scored]


def _build_job_alert_html(keywords: str, location: str, jobs: List[Dict[str, Any]], unsubscribe_url: str | None = None) -> str:
    from datetime import date

    ranked = _rank_jobs(jobs[:20], keywords, location or "")
    kw_esc = html_lib.escape(keywords)
    loc_esc = html_lib.escape(location) if location else ""
    loc_line = f" in <strong style='color:#fff;'>{loc_esc}</strong>" if location else ""
    count = len(jobs)
    date_str = date.today().strftime("%d.%m.%Y")
    app_url = getattr(settings, "FRONTEND_URL", "https://jobassist.tech")

    # ── Build job cards ───────────────────────────────────────────────────────
    cards = ""
    for i, job in enumerate(ranked):
        title   = html_lib.escape(job.get("title") or "Ohne Titel")
        company = html_lib.escape(job.get("company") or "Unbekanntes Unternehmen")
        loc     = html_lib.escape(job.get("location") or location or "")
        url     = _safe_url(job.get("full_url") or "#")
        salary  = html_lib.escape(job.get("salary_range") or job.get("salary") or "")
        jtype   = html_lib.escape(job.get("contract_type") or job.get("job_type") or "")

        # Rank badge
        if i == 0:
            rank_badge = '<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;letter-spacing:0.3px;">#1 &nbsp;Top Match</span>'
            card_border = "#f59e0b"
            card_bg     = "#fffbeb"
        elif i == 1:
            rank_badge = '<span style="display:inline-block;background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;">#2</span>'
            card_border = "#e2e8f0"
            card_bg     = "#ffffff"
        elif i == 2:
            rank_badge = '<span style="display:inline-block;background:#fff7ed;color:#c2410c;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;">#3</span>'
            card_border = "#e2e8f0"
            card_bg     = "#ffffff"
        else:
            rank_badge = f'<span style="display:inline-block;background:#f8fafc;color:#64748b;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px;">#{i+1}</span>'
            card_border = "#e2e8f0"
            card_bg     = "#ffffff"

        loc_chip    = f'<span style="display:inline-block;background:#f1f5f9;color:#64748b;font-size:11px;padding:3px 8px;border-radius:6px;margin:6px 4px 0 0;">&#128205; {loc}</span>' if loc else ""
        salary_chip = f'<span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;margin:6px 4px 0 0;">&#128182; {salary}</span>' if salary else ""
        type_chip   = f'<span style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:11px;padding:3px 8px;border-radius:6px;margin:6px 4px 0 0;">{jtype}</span>' if jtype else ""

        cards += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;border:2px solid {card_border};border-radius:12px;overflow:hidden;background:{card_bg};">
          <tr>
            <td style="padding:16px 18px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" style="padding-right:14px;">
                    <div style="margin-bottom:7px;">{rank_badge}</div>
                    <a href="{url}" style="font-size:15px;font-weight:700;color:#0f172a;text-decoration:none;line-height:1.35;display:block;">{title}</a>
                    <span style="font-size:13px;color:#64748b;display:block;margin-top:3px;">{company}</span>
                    <div>{loc_chip}{salary_chip}{type_chip}</div>
                  </td>
                  <td align="right" valign="middle" style="white-space:nowrap;">
                    <a href="{url}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:8px;text-decoration:none;white-space:nowrap;">Bewerben &#8594;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>"""

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Neue Stellen &#8211; {kw_esc}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f1f5f9;">{count} neue Stellen f&#252;r {kw_esc} &#8212; Jetzt auf JobAssist ansehen &#128338;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:30px 36px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle">
                <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:8px;padding:4px 12px;margin-bottom:14px;">
                  <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:1.2px;">&#9889; JOBASSIST</span>
                </div>
                <h1 style="color:#fff;margin:0 0 8px;font-size:24px;font-weight:800;line-height:1.25;letter-spacing:-0.3px;">{count} neue Stellen f&#252;r dich</h1>
                <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;line-height:1.6;">
                  Suchbegriff: <strong style="color:#fff;">{kw_esc}</strong>{loc_line}
                </p>
              </td>
              <td align="right" valign="middle" style="padding-left:16px;">
                <div style="background:rgba(255,255,255,0.15);border-radius:50%;width:54px;height:54px;text-align:center;line-height:54px;font-size:24px;">&#128276;</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- META BAR -->
      <tr>
        <td style="background:#1e3a8a;padding:9px 36px;">
          <span style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;">
            {count} Stellen &nbsp;&#183;&nbsp; Sortiert nach Relevanz &nbsp;&#183;&nbsp; {date_str}
          </span>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#ffffff;padding:28px 36px;">

          <!-- TIPS BOX -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faff;border-radius:12px;border-left:4px solid #3b82f6;margin-bottom:26px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#3b82f6;">&#128161; Profi-Tipps f&#252;r deine Bewerbung</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:4px 0;font-size:13px;color:#374151;line-height:1.55;">
                    <strong>&#9200; Schnell bewerben:</strong> Wer sich in den ersten 48 Stunden bewirbt, erh&#228;lt deutlich h&#228;ufiger eine Einladung zum Gespr&#228;ch.
                  </td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#374151;line-height:1.55;">
                    <strong>&#9997; Individuelles Anschreiben:</strong> Passe jedes Anschreiben gezielt an &#8212; JobAssist AI erstellt es f&#252;r dich in Sekunden.
                  </td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#374151;line-height:1.55;">
                    <strong>&#128269; Unternehmensrecherche:</strong> Informierte Bewerber wirken motivierter und hinterlassen einen bleibenden Eindruck.
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- JOBS HEADER -->
          <p style="margin:0 0 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Top Stellenangebote &#8212; nach Relevanz gerankt</p>

          <!-- JOB CARDS -->
          {cards}

          <!-- APP CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-radius:12px;margin-top:6px;">
            <tr>
              <td style="padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle">
                      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e293b;">Bewerbung vorbereiten mit JobAssist AI</p>
                      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">Anschreiben, Match-Analyse &amp; Gespr&#228;chsvorbereitung auf Knopfdruck.</p>
                    </td>
                    <td align="right" valign="middle" style="padding-left:14px;">
                      <a href="{app_url}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:12px;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none;white-space:nowrap;">Jetzt starten &#8594;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 36px;border-top:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#475569;">&#9889; JobAssist &middot; jobassist.tech</p>
                <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;line-height:1.7;">
                  Du erh&#228;ltst diese E-Mail, weil du einen Job-Alert f&#252;r <strong style="color:#64748b;">{kw_esc}</strong> eingerichtet hast.<br>
                  <a href="{app_url}/job-alerts" style="color:#3b82f6;text-decoration:none;">Alert verwalten</a> &nbsp;&middot;&nbsp; <a href="{html_lib.escape(unsubscribe_url) if unsubscribe_url else f'{app_url}/job-alerts'}" style="color:#3b82f6;text-decoration:none;">Abmelden</a>
                </p>
                <p style="margin:0;font-size:10px;color:#cbd5e1;">&#169; 2025–2026 JobAssist. Alle Rechte vorbehalten.</p>
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


def _send_via_brevo(to_email: str, subject: str, html_body: str, reply_to: str | None = None) -> bool:
    if not settings.BREVO_API_KEY:
        return False

    from_email = settings.EMAILS_FROM_EMAIL or "noreply@jobassist.app"
    from_name = settings.EMAILS_FROM_NAME or "JobAssist"
    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}

    try:
        api_key = settings.BREVO_API_KEY.strip()
        with httpx.Client(timeout=15) as client:
            response = client.post(
                BREVO_SEND_URL,
                json=payload,
                headers={"api-key": api_key, "Content-Type": "application/json"},
            )
            if not response.is_success:
                logger.error(
                    "Brevo response error",
                    extra={
                        "status_code": response.status_code,
                        "provider": "brevo",
                    },
                )
            response.raise_for_status()
        masked = _mask_email(to_email)
        domain = to_email.split("@", 1)[-1] if "@" in to_email else "-"
        logger.info(
            "Email sent via Brevo",
            extra={"recipient": masked, "to_domain": domain, "subject": subject},
        )
        return True
    except Exception as exc:
        masked = _mask_email(to_email)
        domain = to_email.split("@", 1)[-1] if "@" in to_email else "-"
        logger.error(
            "Email send failed (Brevo)",
            extra={"recipient": masked, "to_domain": domain, "error": str(exc)},
            exc_info=True,
        )
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str, reply_to: str | None = None) -> bool:
    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        return False

    from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
    from_name = settings.EMAILS_FROM_NAME or "JobAssist"

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to_email
    if reply_to:
        message["Reply-To"] = reply_to
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        # For Brevo SMTP relay, login user must be the account email, not a display name
        smtp_login = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(smtp_login, settings.SMTP_PASSWORD)
            server.sendmail(from_email, [to_email], message.as_string())
        masked = _mask_email(to_email)
        domain = to_email.split("@", 1)[-1] if "@" in to_email else "-"
        logger.info(
            "Email sent via SMTP",
            extra={"recipient": masked, "to_domain": domain, "subject": subject},
        )
        return True
    except Exception as exc:
        masked = _mask_email(to_email)
        domain = to_email.split("@", 1)[-1] if "@" in to_email else "-"
        logger.error(
            "Email send failed (SMTP)",
            extra={"recipient": masked, "to_domain": domain, "error": str(exc)},
            exc_info=True,
        )
        return False


def send_transactional_email(to_email: str, subject: str, html_body: str | None = None, reply_to: str | None = None) -> bool:
    body = html_body or ""
    if _send_via_brevo(to_email, subject, body, reply_to=reply_to):
        return True
    if _send_via_smtp(to_email, subject, body, reply_to=reply_to):
        return True

    logger.warning("No email provider configured or all providers failed - skipping email send")
    return False


def send_verification_email(to_email: str, token: str) -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">E-Mail-Adresse bestätigen</h1>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:15px;color:#374151;">Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen:</p>
      <a href="{html_lib.escape(verify_url)}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none;font-size:15px;">E-Mail bestätigen</a>
      <p style="font-size:13px;color:#9ca3af;margin-top:16px;">Dieser Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>
    </div>
  </div>
</body></html>"""
    return send_transactional_email(to_email, "JobAssist - E-Mail bestätigen", html_body=html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Passwort zurücksetzen</h1>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:15px;color:#374151;">Du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Button:</p>
      <a href="{html_lib.escape(reset_url)}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none;font-size:15px;">Passwort zurücksetzen</a>
      <p style="font-size:13px;color:#9ca3af;margin-top:16px;">Dieser Link ist 1 Stunde gültig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail.</p>
    </div>
  </div>
</body></html>"""
    return send_transactional_email(to_email, "JobAssist - Passwort zurücksetzen", html_body=html)


def send_job_alert_email(to_email: str, keywords: str, location: str, jobs: List[Dict[str, Any]], unsubscribe_url: str | None = None) -> bool:
    if not jobs:
        logger.info("No jobs found for alert '%s' - skipping email", keywords)
        return False

    html_body = _build_job_alert_html(keywords, location or "", jobs, unsubscribe_url=unsubscribe_url)
    subject = f"⚡ {len(jobs)} neue Stellen für '{keywords.strip()}' – Jetzt bewerben"
    return send_transactional_email(to_email, subject, html_body=html_body)
