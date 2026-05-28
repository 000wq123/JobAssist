"""
job_enrich — metadata extractor for German-language job postings.

Two-stage pipeline:
    1. `extract_metadata(description)` — regex-only, free, microseconds.
       Catches the easy ~70 % of cases where the wage / city / deadline
       appear in obvious phrasing.
    2. `extract_metadata_ai(description)` — Groq llama-3.3-70b fallback for
       the long tail. Returns strict JSON, parsed and validated against the
       same shape as the regex extractor.

The async helper `enrich_async(description, prefer_regex=True)` runs stage 1
synchronously, then falls back to stage 2 only for fields the regex left
empty. Designed to be called once per job (e.g. inside `GET /jobs/{id}` the
first time the user opens a stale row); subsequent reads short-circuit
because the persisted columns are no longer NULL.

Both stages return the same dict shape — three keys, any of which may be None.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional, TypedDict

logger = logging.getLogger(__name__)


class ExtractedMetadata(TypedDict, total=False):
    salary_text: Optional[str]
    location: Optional[str]
    expires_at: Optional[datetime]
    category: Optional[str]


# Title-based category classifier. Order matters — first match wins, so the
# more specific keywords (Samstagsjob, Lehre) come before broad ones.
_CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("samstagsjob", ["samstagsjob", "samstag-job", "wochenendjob", "samstag/sonntag"]),
    ("ferialjob",   ["ferialjob", "ferialpraktikum", "ferialarbeit"]),
    ("lehre",       ["lehre", "lehrling", "lehrstelle", "ausbildung", "apprentice"]),
    ("praktikum",   ["praktikum", "praktikant", "praktikantin", "intern ", "internship", "trainee"]),
    ("geringfügig", ["geringfügig", "geringfügige", "minijob", "aushilfe"]),
    ("teilzeit",    ["teilzeit", "part-time", "part time", "halbtags"]),
    ("vollzeit",    ["vollzeit", "full-time", "full time", "ganztags"]),
]


def classify_category(role: Optional[str], description: Optional[str] = None) -> Optional[str]:
    """
    Classify the job category from role title (and optionally description).

    Returns one of the canonical slugs the frontend's `categoryLabel` knows
    about, or None when no keyword matches. Never returns "other" — that's
    the DB default and means "we haven't tried yet"; None preserves that
    semantic in the extractor's output.
    """
    haystack = " ".join(filter(None, [role, description])).lower()
    if not haystack.strip():
        return None
    for slug, keywords in _CATEGORY_KEYWORDS:
        if any(k in haystack for k in keywords):
            return slug
    return None


# ─── Salary patterns ─────────────────────────────────────────────────────────
#
# Ordered most-specific-first. The first match wins.
#
# 1. Hourly:   "€10,20/h" · "EUR 10.50 pro Stunde" · "10,20 €/Std"
# 2. Monthly:  "€ 2.500 brutto/Monat" · "Monatsgehalt € 1.800"
# 3. Annual:   "€ 25.000 – 35.000 brutto/Jahr" · "ab € 30.000 p.a."
#
# All numeric forms accept German thousands-separators (".") and the German
# decimal comma (",") indifferently — we let the frontend's parseSalary do the
# final numeric normalisation.

_NUM = r"\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?"

_RE_HOURLY = re.compile(
    rf"""(?xi)
    (?P<sym>€|EUR)?\s*
    (?P<n>{_NUM})
    \s*(?:€|EUR)?
    \s*(?:/|pro\s+)
    (?:h\b|std\.?|stunde)
    """
)

_RE_MONTHLY = re.compile(
    rf"""(?xi)
    (?:Monatsgehalt|Gehalt|Verdienst|brutto)?\s*
    (?P<sym>€|EUR)?\s*
    (?P<n>{_NUM})
    (?:\s*[-–—]\s*(?P<n2>{_NUM}))?      # optional range
    \s*(?:€|EUR)?
    \s*(?:brutto|netto)?
    \s*(?:/|pro\s+)
    (?:Monat|mtl\.?)
    """
)

_RE_ANNUAL = re.compile(
    rf"""(?xi)
    (?:Jahresgehalt|Mindestgehalt|Gehalt|ab|brutto)?\s*
    (?P<sym>€|EUR)?\s*
    (?P<n>{_NUM})
    (?:\s*[-–—]\s*(?P<n2>{_NUM}))?      # optional range "X – Y"
    \s*(?:€|EUR)?
    \s*(?:brutto|netto)?
    \s*(?:/|pro\s+|p\.?\s*a\.?)
    (?:Jahr|Jahresgehalt|Annum)?
    """
)

# Fallback: bare "ab € 30.000" / "€ 25.000 - 35.000" with no unit hint —
# treated as annual when the value is ≥ 1000 (heuristic: hourly wages are
# never four-digit).
_RE_BARE = re.compile(
    rf"""(?xi)
    (?:ab|von|Mindestgehalt|Gehalt)\s*
    (?:€|EUR)\s*
    (?P<n>{_NUM})
    (?:\s*[-–—]\s*(?P<n2>{_NUM}))?
    \s*(?:brutto|netto)?
    """
)


def _normalise_number(s: str) -> Optional[float]:
    """German/English number → float. '1.234,50' / '25,000' / '10.20'."""
    if not s:
        return None
    s = s.replace(" ", "")
    # If both separators present: last one wins as decimal.
    if "." in s and "," in s:
        last = max(s.rfind("."), s.rfind(","))
        whole = re.sub(r"[.,]", "", s[:last])
        return float(f"{whole}.{s[last + 1:]}")
    # Single separator: distinguish thousands vs decimal by tail length.
    for sep in (",", "."):
        if sep in s:
            tail = s.rsplit(sep, 1)[1]
            if len(tail) in (1, 2):
                return float(s.replace(sep, "."))
            return float(s.replace(sep, ""))
    try:
        return float(s)
    except ValueError:
        return None


def _format_hourly(n: float) -> str:
    return f"€{n:.2f}/h".replace(".", ",")


def _format_monthly(lo: float, hi: Optional[float] = None) -> str:
    if hi is not None:
        return f"€ {int(lo):,} – {int(hi):,} brutto/Monat".replace(",", ".")
    return f"€ {int(lo):,} brutto/Monat".replace(",", ".")


def _format_annual(lo: float, hi: Optional[float] = None) -> str:
    if hi is not None:
        return f"€ {int(lo):,} – {int(hi):,} brutto/Jahr".replace(",", ".")
    return f"€ {int(lo):,} brutto/Jahr".replace(",", ".")


def _extract_salary(text: str) -> Optional[str]:
    # 1. Hourly wins over everything (clearest signal).
    m = _RE_HOURLY.search(text)
    if m:
        n = _normalise_number(m.group("n"))
        if n and 3 <= n <= 100:                  # sanity: reject obvious noise
            return _format_hourly(n)

    # 2. Explicit monthly.
    m = _RE_MONTHLY.search(text)
    if m:
        lo = _normalise_number(m.group("n"))
        hi = _normalise_number(m.group("n2")) if m.group("n2") else None
        if lo and 500 <= lo <= 50_000:
            return _format_monthly(lo, hi if hi and hi > lo else None)

    # 3. Explicit annual.
    m = _RE_ANNUAL.search(text)
    if m:
        lo = _normalise_number(m.group("n"))
        hi = _normalise_number(m.group("n2")) if m.group("n2") else None
        if lo and 10_000 <= lo <= 500_000:
            return _format_annual(lo, hi if hi and hi > lo else None)

    # 4. Bare "ab € 30.000" — treat as annual if ≥ 1000.
    m = _RE_BARE.search(text)
    if m:
        lo = _normalise_number(m.group("n"))
        hi = _normalise_number(m.group("n2")) if m.group("n2") else None
        if lo and lo >= 1000:
            if lo >= 10_000:
                return _format_annual(lo, hi if hi and hi > lo else None)
            return _format_monthly(lo, hi if hi and hi > lo else None)

    return None


# ─── Location patterns ──────────────────────────────────────────────────────

# Major Austrian cities + the country itself. Ordered: more specific first
# (e.g. "St. Pölten" before "Wien" doesn't matter since they're distinct, but
# postal-code patterns are tried first so "1010 Wien" wins over "Wien" alone).
_AT_CITIES = [
    "Wien", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt",
    "Villach", "Wels", "Sankt Pölten", "St. Pölten", "Dornbirn", "Steyr",
    "Feldkirch", "Bregenz", "Leonding", "Klosterneuburg", "Baden", "Wolfsberg",
    "Leoben", "Krems", "Traun", "Amstetten", "Kapfenberg", "Mödling",
    "Hallein", "Lustenau", "Spittal", "Eisenstadt", "Tulln", "Hohenems",
]

_RE_POSTAL_AT = re.compile(
    r"\b([1-9]\d{3})\s+(" + "|".join(re.escape(c) for c in _AT_CITIES) + r")\b"
)
_RE_CITY_AT   = re.compile(
    r"(?xi)(?:in|standort|arbeitsort|dienstort|büro\s+in|für|raum)\s+"
    r"(" + "|".join(re.escape(c) for c in _AT_CITIES) + r")\b"
)
_RE_CITY_BARE = re.compile(
    r"\b(" + "|".join(re.escape(c) for c in _AT_CITIES) + r")\b"
)


def _extract_location(text: str) -> Optional[str]:
    # Prefer postal-code-anchored matches (most precise).
    m = _RE_POSTAL_AT.search(text)
    if m:
        return f"{m.group(1)} {m.group(2).strip().rstrip(',')}"
    # Then context-anchored ("in Wien", "Standort Graz").
    m = _RE_CITY_AT.search(text)
    if m:
        return m.group(1)
    # Then bare city name (least reliable — first occurrence only).
    m = _RE_CITY_BARE.search(text)
    if m:
        return m.group(1)
    return None


# ─── Deadline patterns ───────────────────────────────────────────────────────

_MONTHS_DE = {
    "januar": 1, "jänner": 1, "februar": 2, "märz": 3, "marz": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8, "september": 9, "oktober": 10,
    "november": 11, "dezember": 12,
}

_RE_DEADLINE_NUMERIC = re.compile(
    r"""(?xi)
    (?:bewerbungsfrist|bewerbung\s+bis|frist|bewerbungsschluss|bis\s+spätestens)
    \s*[:\-]?\s*
    (?P<d>\d{1,2})[.\s/-]\s*
    (?P<m>\d{1,2})[.\s/-]\s*
    (?P<y>\d{2,4})
    """
)
_RE_DEADLINE_TEXTUAL = re.compile(
    r"""(?xi)
    (?:bewerbungsfrist|bewerbung\s+bis|frist|bewerbungsschluss|bis\s+spätestens)
    \s*[:\-]?\s*
    (?P<d>\d{1,2})\.?\s+
    (?P<m>januar|jänner|februar|märz|marz|april|mai|juni|juli|august|september|oktober|november|dezember)
    \s+(?P<y>\d{4})
    """
)


def _extract_deadline(text: str) -> Optional[datetime]:
    m = _RE_DEADLINE_NUMERIC.search(text)
    if m:
        try:
            d, mo = int(m.group("d")), int(m.group("m"))
            y = int(m.group("y"))
            if y < 100:
                y += 2000
            return datetime(y, mo, d, tzinfo=timezone.utc)
        except (ValueError, OverflowError):
            pass
    m = _RE_DEADLINE_TEXTUAL.search(text)
    if m:
        try:
            d = int(m.group("d"))
            mo = _MONTHS_DE[m.group("m").lower()]
            y = int(m.group("y"))
            return datetime(y, mo, d, tzinfo=timezone.utc)
        except (ValueError, KeyError, OverflowError):
            pass
    return None


# ─── Public API ──────────────────────────────────────────────────────────────

def extract_metadata(
    description: Optional[str],
    role: Optional[str] = None,
) -> ExtractedMetadata:
    """
    Heuristically extract structured fields from a German job description.

    Always safe to call: returns an all-None dict when nothing is found.

    `role` is optional — when provided, category classification is more
    accurate because role titles (e.g. "Praktikum im Marketing") tend to
    state the job type explicitly even when the description doesn't.
    """
    if not description and not role:
        return {
            "salary_text": None, "location": None,
            "expires_at": None, "category": None,
        }

    text = (description or "").replace("\xa0", " ")

    return {
        "salary_text": _extract_salary(text)   if text else None,
        "location":    _extract_location(text) if text else None,
        "expires_at":  _extract_deadline(text) if text else None,
        "category":    classify_category(role, text),
    }


# ─── AI fallback (Groq) ──────────────────────────────────────────────────────

_AI_SYSTEM = (
    "Du extrahierst strukturierte Felder aus deutschsprachigen Stellenanzeigen "
    "(österreichischer Arbeitsmarkt). Antworte ausschließlich mit gültigem JSON "
    "im vorgegebenen Schema — keine Erklärungen, keine Markdown-Codefences."
)

_AI_PROMPT_TMPL = """Extrahiere die folgenden vier Felder aus der Stellenanzeige.

Schema (Strings oder null):
{{
  "salary":   string | null,   // Lohn/Gehalt wie er im Text genannt wird, z. B. "€10,20/h", "€ 2.500 brutto/Monat", "€ 35.000 – 45.000 brutto/Jahr". null wenn nicht genannt.
  "location": string | null,   // Ort/Stadt mit optionaler PLZ, z. B. "Wien", "1010 Wien", "Graz". null wenn nicht genannt.
  "deadline": string | null,   // Bewerbungsfrist als ISO-Datum "YYYY-MM-DD". null wenn nicht genannt.
  "category": string | null    // Genau einer von: samstagsjob, ferialjob, lehre, praktikum, geringfügig, teilzeit, vollzeit. null wenn unklar.
}}

WICHTIG:
- Erfinde NICHTS. Wenn ein Feld nicht klar im Text steht → null.
- Bei Gehaltsspannen die vollständige Spanne übernehmen.
- Keine Schätzungen, keine Hochrechnungen.
- Antworte nur mit dem JSON-Objekt.

Rolle: {role}

Stellenanzeige:
\"\"\"
{description}
\"\"\""""


def _strip_code_fences(text: str) -> str:
    """Remove ```json … ``` wrappers the model occasionally adds despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_ai_deadline(raw: Optional[str]) -> Optional[datetime]:
    if not raw or not isinstance(raw, str):
        return None
    try:
        # Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
        s = raw.strip().split("T")[0]
        y, m, d = (int(p) for p in s.split("-"))
        return datetime(y, m, d, tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        return None


_VALID_CATEGORIES = {
    "samstagsjob", "ferialjob", "lehre", "praktikum",
    "geringfügig", "teilzeit", "vollzeit",
}


async def extract_metadata_ai(
    description: Optional[str],
    role: Optional[str] = None,
) -> ExtractedMetadata:
    """
    Ask Groq (llama-3.3-70b) to extract the four enrichment fields.

    Returns the all-None dict on any error — never raises. Designed to be a
    safe fallback that the caller merges with regex output via `or` semantics.
    """
    empty: ExtractedMetadata = {
        "salary_text": None, "location": None,
        "expires_at": None, "category": None,
    }

    if not description or len(description) < 80:
        return empty

    # Import lazily so the regex stage doesn't pay an import cost / fail in
    # environments where Groq isn't configured (tests, dev without API key).
    try:
        from app.services.claude_service import call_groq_async
    except ImportError:
        return empty

    # Truncate aggressively — Groq has TPM limits and we only need the gist.
    snippet = description[:4000]
    prompt = _AI_PROMPT_TMPL.format(description=snippet, role=role or "")

    try:
        raw = await call_groq_async(prompt, system=_AI_SYSTEM, max_tokens=256, temperature=0.0)
    except Exception as e:                                    # noqa: BLE001
        logger.warning("job_enrich AI fallback failed: %s", e)
        return empty

    try:
        data = json.loads(_strip_code_fences(raw))
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning("job_enrich AI returned non-JSON (%s): %r", e, raw[:200])
        return empty

    if not isinstance(data, dict):
        return empty

    salary   = data.get("salary")
    location = data.get("location")
    deadline = data.get("deadline")
    category = data.get("category")
    cat_norm = (category.strip().lower() if isinstance(category, str) else None)
    if cat_norm not in _VALID_CATEGORIES:
        cat_norm = None

    return {
        "salary_text": salary   if isinstance(salary, str)   and salary.strip()   else None,
        "location":    location if isinstance(location, str) and location.strip() else None,
        "expires_at":  _parse_ai_deadline(deadline),
        "category":    cat_norm,
    }


async def enrich_async(
    description: Optional[str],
    role: Optional[str] = None,
) -> ExtractedMetadata:
    """
    Two-stage extraction: regex first, AI fills the gaps.

    Stage 2 (AI) runs only when at least one regex field is still None. If
    every field was found by regex, no AI call is made.
    """
    regex_result = extract_metadata(description, role=role)
    missing = [k for k, v in regex_result.items() if v is None]
    logger.info(
        "job_enrich: regex result salary=%r location=%r expires_at=%r category=%r missing=%s",
        regex_result["salary_text"], regex_result["location"],
        regex_result["expires_at"], regex_result["category"], missing,
    )
    if not missing:
        return regex_result

    logger.info("job_enrich: calling Groq AI fallback for fields=%s", missing)
    ai_result = await extract_metadata_ai(description, role=role)
    logger.info(
        "job_enrich: AI result salary=%r location=%r expires_at=%r category=%r",
        ai_result["salary_text"], ai_result["location"],
        ai_result["expires_at"], ai_result["category"],
    )
    return {
        "salary_text": regex_result["salary_text"] or ai_result["salary_text"],
        "location":    regex_result["location"]    or ai_result["location"],
        "expires_at":  regex_result["expires_at"]  or ai_result["expires_at"],
        "category":    regex_result["category"]    or ai_result["category"],
    }
