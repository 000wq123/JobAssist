"""Unit tests for the contact-form notification email (app/api/routes/contact.py).

Asserts the notification email is professional/simple and uses the JobAssist
brand design tokens (same palette as app/services/email_service.py).
No real email is sent — the template is rendered statically.
"""
import re


def _route_source() -> str:
    with open("app/api/routes/contact.py", "r", encoding="utf-8") as f:
        return f.read()


def _render_contact_html(
    name: str = "Max Mustermann",
    topic: str = "Frage zur Mitgliedschaft",
    email: str = "max@example.com",
    message: str = "Hallo, ich habe eine Frage zu meinem Abonnement.",
) -> str:
    """Extract the html_body f-string template from the route and render it
    with sanitized sample values (mirroring the route's own escaping)."""
    src = _route_source()
    m = re.search(r'html_body = f"""(.*?)"""', src, re.S)
    assert m, "html_body template not found in contact.py"
    template = m.group(1)

    def one_line(s: str) -> str:
        return " ".join(s.replace("\r", " ").replace("\n", " ").split())

    safe_name = one_line(name)[:200]
    safe_topic = one_line(topic)[:200]
    safe_email = email
    safe_message = message.strip()[:5000]
    return eval('f"""' + template + '"""')


# ---------------------------------------------------------------------------
# Brand design tokens
# ---------------------------------------------------------------------------

def test_contact_email_uses_brand_red():
    html = _render_contact_html()
    assert "#E30613" in html, "brand red missing"


def test_contact_email_uses_paper_card():
    html = _render_contact_html()
    assert "#FDFCF9" in html, "warm paper surface missing"


def test_contact_email_uses_brand_border():
    html = _render_contact_html()
    assert "#E8E8E4" in html, "brand border token missing"


def test_contact_email_uses_brand_logo_badge():
    html = _render_contact_html()
    assert "background:#E30613;border-radius:8px;width:32px" in html, "JA logo badge missing"


def test_contact_email_no_offbrand_slate_styling():
    html = _render_contact_html()
    assert "#1e293b" not in html, "old slate text color still present"
    assert "#f8fafc" not in html, "old slate surface still present"


# ---------------------------------------------------------------------------
# Professional & simple structure
# ---------------------------------------------------------------------------

def test_contact_email_has_label_header():
    html = _render_contact_html()
    assert "Kontaktanfrage" in html, "label header missing"


def test_contact_email_shows_sender_fields():
    html = _render_contact_html()
    assert "Max Mustermann" in html
    assert "max@example.com" in html


def test_contact_email_message_in_neutral_box():
    html = _render_contact_html()
    assert "background:#FFFFFF;border:1px solid #E8E8E4" in html, "neutral message box missing"
    assert "Hallo, ich habe eine Frage" in html


def test_contact_email_no_marketing_upsell():
    html = _render_contact_html()
    assert "Tipp:" not in html
    assert "Jetzt bewerben" not in html
    assert "AI-Builder" not in html


def test_contact_email_subject_professional():
    src = _route_source()
    assert 'f"JobAssist: Kontaktanfrage' in src, "subject line not professional format"
    assert "⚡" not in src, "emoji in subject"


def test_contact_email_footer_marks_internal():
    html = _render_contact_html()
    assert "Interne Benachrichtigung" in html, "internal-notification footer missing"


# ---------------------------------------------------------------------------
# Security / sanitization still intact
# ---------------------------------------------------------------------------

def test_contact_email_sanitizes_newlines_in_name():
    html = _render_contact_html(name="Bad\nActor\r\nHere")
    assert "Bad\nActor" not in html, "newline survived into name field"
    assert "Bad Actor Here" in html


def test_contact_email_rejects_short_message():
    src = _route_source()
    assert "Nachricht zu kurz" in src
    assert "len(payload.message.strip()) < 10" in src
