import html as html_lib
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

# ────────────────────────────────────────────────────────────────────────────
# JobAssist brand palette — mirrors frontend/src/index.css design tokens.
# Emails use only these values (plus safe neutrals) so they feel native to
# the product instead of using off-brand blues/purples.
#   brand red      #E30613  (--app-brand)
#   brand hover    #C9000B  (--app-brand-hover)
#   brand soft     #FFF0F1  (--app-brand-soft)
#   paper          #FAFAF8  (--app-bg)  / warm card #FDFCF9 (--app-cv-paper)
#   surface        #FFFFFF  (--app-surface)  hover #F5F5F3
#   borders        #E8E8E4  (--app-border-subtle)  strong #D2D2CD
#   text           #171717  (--app-text)  secondary #525252  muted #5A5A5A
#   success        #5D9F68  (--app-success)
#   warning        #B79649  (--app-warning)
#   radius         sm 6 / md 8 / lg 12 / xl 16 (rounded; emails use 12/16)
# ---------------------------------------------------------------------------
BRAND        = "#E30613"
BRAND_DARK   = "#C9000B"   # hover / dark-background accent
BRAND_SOFT   = "#FFF0F1"   # pale red tint for labels/accents
BG_PAGE      = "#F2F1ED"   # slightly deeper than --app-bg so the paper pops
PAPER        = "#FDFCF9"   # warm card surface (--app-cv-paper)
SURFACE      = "#FFFFFF"
SURFACE_HV   = "#F5F5F3"
BORDER       = "#E8E8E4"
BORDER_STR   = "#D2D2CD"
TEXT         = "#171717"
TEXT_SEC     = "#525252"
TEXT_MUTED   = "#5A5A5A"
TEXT_FAINT   = "#9A9A94"
SUCCESS      = "#5D9F68"
WARNING      = "#B79649"
FONT_FAMILY = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _shell(title: str, body: str, *, preheader: str = "") -> str:
    """Full, self-contained HTML document wrapps a body fragment with the
    JobAssist brand frame (header bar + footer), leaving room for email
    clients' quirks (tables, inline styles, no flexbox).
    """
    pre = html_lib.escape(preheader) if preheader else title
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>{html_lib.escape(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:{BG_PAGE};font-family:{FONT_FAMILY};">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:{BG_PAGE};">{pre} &#8203;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BG_PAGE};padding:32px 16px;">
    <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- Logo row -->
      <tr>
        <td style="padding:0 0 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="display:inline-block;background:{BRAND};border-radius:8px;width:32px;height:32px;text-align:center;line-height:32px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">JA</span>
                <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:16px;font-weight:800;color:{TEXT};letter-spacing:-0.2px;">JobAssist</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Paper card -->
      <tr>
        <td style="background:{PAPER};border:1px solid {BORDER};border-radius:16px;padding:36px 38px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          {body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:22px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="color:{TEXT_FAINT};font-size:11px;line-height:1.7;">
                <span style="font-weight:700;color:{TEXT_MUTED};">JobAssist</span> &nbsp;&middot;&nbsp; jobassist.tech<br>
                Du erh&#228;ltst diese E-Mail von JobAssist. &nbsp;<span style="color:{TEXT_FAINT};">&#169; 2025&#8211;2026</span>
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


def _button(text: str, href: str, *, dark: bool = False) -> str:
    """Primary action button (brand red). Inline a11y-friendly."""
    bg = BRAND_DARK if dark else BRAND
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;">'
        f'<tr><td style="border-radius:8px;background:{bg};">'
        f'<a href="{_safe_url(href)}" style="display:inline-block;padding:12px 26px;background:{bg};'
        f'border-radius:8px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;'
        f'border:0;" target="_blank" rel="noopener">{text}</a>'
        f"</td></tr></table>"
    )


def _attrs(rows: List[str]) -> str:
    """Small vertical list of plain-language benefit/„property” rows."""
    items = "".join(
        f'<tr><td style="padding:5px 0 0;font-size:13px;color:{TEXT_SEC};line-height:1.55;">'
        f'<span style="color:{SUCCESS};font-weight:700;margin-right:8px;">&#10003;</span>{r}</td></tr>'
        for r in rows
    )
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:14px 0 6px;">{items}</table>'
    )


def _rule() -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td style="border-top:1px solid {BORDER_STR};font-size:0;line-height:0;">&nbsp;</td></tr></table>'
    )


def _note(icon: str, text: str) -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="background:{SURFACE_HV};border:1px solid {BORDER};border-radius:12px;margin:18px 0 0;">'
        f'<tr><td style="padding:14px 18px;font-size:12.5px;color:{TEXT_SEC};line-height:1.6;">'
        f'<span style="margin-right:8px;">{icon}</span>{text}</td></tr></table>'
    )


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


def _rank_jobs(jobs: List[Dict], keywords: str, location: str) -> List[Dict]:
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


def _build_job_alert_html(keywords: str, location: str, jobs: List[Dict], unsubscribe_url: str | None = None) -> str:
    from datetime import date

    ranked = _rank_jobs(jobs[:20], keywords, location or "")
    kw_esc = html_lib.escape(keywords)
    loc_esc = html_lib.escape(location) if location else ""
    loc_line = f" in <strong style='color:{TEXT};'>{loc_esc}</strong>" if location else ""
    count = len(jobs)
    date_str = date.today().strftime("%d.%m.%Y")
    app_url = getattr(settings, "FRONTEND_URL", "https://jobassist.tech")

    # ── Build job cards (neutral cards on warm paper, brand-red action) ───────
    cards = ""
    for i, job in enumerate(ranked):
        title   = html_lib.escape(job.get("title") or "Ohne Titel")
        company = html_lib.escape(job.get("company") or "Unbekanntes Unternehmen")
        loc     = html_lib.escape(job.get("location") or location or "")
        url     = _safe_url(job.get("full_url") or "#")
        salary  = html_lib.escape(job.get("salary_range") or job.get("salary") or "")
        jtype   = html_lib.escape(job.get("contract_type") or job.get("job_type") or "")

        if i == 0:
            rank_badge = f'<span style="display:inline-block;background:{BRAND_SOFT};color:{BRAND_DARK};font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:0.4px;">#1 &nbsp;Top-Match</span>'
        else:
            rank_badge = f'<span style="display:inline-block;background:{SURFACE_HV};color:{TEXT_MUTED};font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;">#{i+1}</span>'

        loc_chip    = f'<span style="display:inline-block;background:{SURFACE_HV};color:{TEXT_SEC};font-size:11px;padding:3px 9px;border-radius:6px;margin:8px 5px 0 0;">&#128205;&nbsp;{loc}</span>' if loc else ""
        salary_chip = f'<span style="display:inline-block;background:{SUCCESS}1A;color:{SUCCESS};font-size:11px;font-weight:600;padding:3px 9px;border-radius:6px;margin:8px 5px 0 0;">{salary}</span>' if salary else ""
        type_chip   = f'<span style="display:inline-block;background:{SURFACE_HV};color:{TEXT_MUTED};font-size:11px;padding:3px 9px;border-radius:6px;margin:8px 5px 0 0;">{jtype}</span>' if jtype else ""

        cards += f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;border:1px solid {BORDER_STR};border-radius:12px;background:{SURFACE};">
          <tr><td style="padding:16px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top">
                  <div style="margin-bottom:8px;">{rank_badge}</div>
                  <a href="{url}" style="font-size:15px;font-weight:700;color:{TEXT};text-decoration:none;line-height:1.4;display:block;">{title}</a>
                  <span style="font-size:13px;color:{TEXT_MUTED};display:block;margin-top:3px;">{company}</span>
                  <div>{loc_chip}{salary_chip}{type_chip}</div>
                </td>
                <td align="right" valign="middle" style="padding-left:16px;white-space:nowrap;">
                  <a href="{url}" style="display:inline-block;background:{BRAND};color:#ffffff;font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:8px;text-decoration:none;white-space:nowrap;">Bewerben &#8594;</a>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>"""

    body = f"""
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{BRAND};">{date_str}</p>
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:{TEXT};line-height:1.25;letter-spacing:-0.3px;">
        {count} neue Stelle{'' if count == 1 else 'n'} f&#252;r dich
      </h1>
      <p style="margin:0 0 4px;font-size:14px;color:{TEXT_SEC};line-height:1.6;">
        Neue Jobs zu <strong style="color:{TEXT};">{kw_esc}</strong>{loc_line} auf JobAssist.
      </p>

      { _attrs(["Direkt als PDF &amp; online bewerben", "Bewerbungen zentral verfolgen"]) }

      { _rule() }

      <p style="margin:18px 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:{TEXT_FAINT};">Top-Treffer nach Relevanz</p>

      {cards}

      <!-- Inline tip -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BRAND_SOFT};border-radius:12px;margin:6px 0 0;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:12.5px;color:{TEXT_SEC};line-height:1.6;">
            <span style="color:{TEXT};"><strong>Tipp:</strong></span> Wer sich in den ersten 48 Stunden bewirbt, erh&#228;lt h&#228;ufiger eine Antwort. Mit dem JobAssist AI-Builder passt du deinen Lebenslauf in wenigen Minuten f&#252;r jede Stelle an.
          </p>
        </td></tr>
      </table>

      { _button("Alle Stellen ansehen", app_url + "/jobs") }

      <p style="margin:20px 0 0;font-size:12px;color:{TEXT_MUTED};line-height:1.7;">
        Du erh&#228;ltst diese E-Mail, weil du einen Job-Alert f&#252;r <strong style="color:{TEXT_SEC};">{kw_esc}</strong> eingerichtet hast.
        &nbsp; <a href="{html_lib.escape(unsubscribe_url) if unsubscribe_url else f'{app_url}/job-alerts'}" style="color:{BRAND};text-decoration:underline;">Alert abbestellen</a>
      </p>
    """

    return _shell(
        f"Neue Stellen f&#252;r {keywords}",
        body,
        preheader=f"{count} neue Stellen f&#252;r {keywords}{((' in ' + location) if location else '')} &#8212; auf JobAssist ansehen",
    )


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
    body = f"""
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{BRAND};">E-Mail best&#228;tigen</p>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:{TEXT};letter-spacing:-0.3px;">Willkommen bei JobAssist</h1>
      <p style="margin:0 0 4px;font-size:14px;color:{TEXT_SEC};line-height:1.65;">
        Sch&#246;n, dass du da bist. Best&#228;tige deine E-Mail-Adresse und du kannst sofort loslegen:
      </p>
      { _attrs(["Lebenslauf erstellen", "Stellen finden &amp; speichern", "KI-Hilfe f&#252;r Bewerbungen"]) }
      { _button("E-Mail-Adresse best&#228;tigen", verify_url) }
      { _note("&#128337;", "Der Link ist <strong>24\u00a0Stunden</strong> g&#252;ltig. Falls du dich nicht registriert hast, ignoriere diese E-Mail einfach.") }
    """
    return send_transactional_email(
        to_email,
        "JobAssist - E-Mail bestätigen",
        html_body=_shell("E-Mail bestätigen", body, preheader="Bestätige deine E-Mail-Adresse und lege sofort los."),
    )


def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    body = f"""
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{BRAND};">Passwort zur&#252;cksetzen</p>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:{TEXT};letter-spacing:-0.3px;">Kein Problem &#8212; wir setzen es zur&#252;ck</h1>
      <p style="margin:0 0 4px;font-size:14px;color:{TEXT_SEC};line-height:1.65;">
        Du hast ein neues Passwort angefordert. Klicke auf den Button, um eins zu vergeben:
      </p>
      { _attrs(["Du kannst weiterhin alle Bewerbungen ansehen", "Der Link funktioniert einmalig"]) }
      { _button("Passwort zur&#252;cksetzen", reset_url) }
      { _note("&#128337;", "Der Link ist <strong>1\u00a0Stunde</strong> g&#252;ltig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail einfach.") }
    """
    return send_transactional_email(
        to_email,
        "JobAssist - Passwort zurücksetzen",
        html_body=_shell("Passwort zurücksetzen", body, preheader="Richte dein neues Passwort ein."),
    )


def send_job_alert_email(to_email: str, keywords: str, location: str, jobs: List[Dict], unsubscribe_url: str | None = None) -> bool:
    if not jobs:
        logger.info("No jobs found for alert '%s' - skipping email", keywords)
        return False

    html_body = _build_job_alert_html(keywords, location or "", jobs, unsubscribe_url=unsubscribe_url)
    subject = f"⚡ {len(jobs)} neue Stellen für '{keywords.strip()}' – Jetzt bewerben"
    return send_transactional_email(to_email, subject, html_body=html_body)
