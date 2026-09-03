import asyncio
import json
import re
import time
from datetime import date
from groq import Groq, AsyncGroq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
_async_client: AsyncGroq | None = None

MODEL          = "openai/gpt-oss-120b"
MODEL_FALLBACK = "qwen/qwen3.8-27b"   # Different family — used after rate-limit hits

# gpt-oss models emit reasoning tokens before the answer; a max_tokens budget
# below ~200 can be consumed entirely by reasoning and return empty content.
# Qwen (and legacy llama models) answer directly.
def _reasoning_overhead(model: str) -> int:
    return 512 if model.startswith("openai/") else 0


def _strip_reasoning(text: str) -> str:
    """Some models return analysis/thinking blocks; strip them so JSON parsing
    and letter output only see the final answer."""
    if not text:
        return text
    # <think>...</think> blocks (qwen-style)
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    # "analysis...assistantfinal" channel markers (gpt-oss style)
    m = re.search(r"assistantfinal", text)
    if m:
        text = text[m.end():].strip()
    return text


def _get_async_client() -> AsyncGroq:
    global _async_client
    if _async_client is None:
        _async_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _async_client


def get_groq_provider_status() -> dict:
    return {
        "configured": bool(settings.GROQ_API_KEY),
        "model": MODEL,
    }


async def call_groq_async(
    prompt: str,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.3,
    **kwargs,
) -> str:
    """Async Groq call — uses asyncio.sleep so retries never block the thread pool.

    Use this for all async route handlers instead of asyncio.to_thread(_call_groq).
    """
    from fastapi import HTTPException
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    schedule = [
        (MODEL,          0),
        (MODEL,          3),
        (MODEL_FALLBACK, 5),
        (MODEL_FALLBACK, 10),
    ]

    for model_to_use, wait in schedule:
        if wait:
            await asyncio.sleep(wait)
        try:
            ac = _get_async_client()
            response = await ac.chat.completions.create(
                model=model_to_use,
                messages=messages,
                max_tokens=max_tokens + _reasoning_overhead(model_to_use),
                temperature=temperature,
                **kwargs,
            )
            content = _strip_reasoning(response.choices[0].message.content or "")
            if not content:
                raise HTTPException(status_code=502, detail="AI returned an empty response. Please try again.")
            return content.strip()
        except HTTPException:
            raise
        except Exception as e:
            err = str(e).lower()
            if "rate" in err or "429" in err:
                continue
            if "api key" in err or "authentication" in err or "401" in err:
                raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")
            raise HTTPException(status_code=502, detail="AI service error. Please try again.")

    raise HTTPException(status_code=429, detail="Too many requests. Please try again in a few seconds.")


def _call_groq(prompt: str, system: str = "", max_tokens: int = 2048, temperature: float = 0.3, **kwargs) -> str:
    """Base helper to call Groq and return text.

    Strategy on 429:
      attempt 0 → primary model, immediate
      attempt 1 → primary model, wait 3 s
      attempt 2 → fallback model (qwen3.8-27b, different family), wait 5 s
      attempt 3 → fallback model, wait 10 s
    This avoids long blocking waits while still recovering gracefully.
    """
    from fastapi import HTTPException
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    schedule = [
        (MODEL,          0),
        (MODEL,          3),
        (MODEL_FALLBACK, 5),
        (MODEL_FALLBACK, 10),
    ]

    for model_to_use, wait in schedule:
        if wait:
            time.sleep(wait)
        try:
            response = client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                max_tokens=max_tokens + _reasoning_overhead(model_to_use),
                temperature=temperature,
                **kwargs,
            )
            content = _strip_reasoning(response.choices[0].message.content or "")
            if not content:
                raise HTTPException(status_code=502, detail="AI returned an empty response. Please try again.")
            return content.strip()
        except HTTPException:
            raise
        except Exception as e:
            err = str(e).lower()
            if "rate" in err or "429" in err:
                continue
            if "api key" in err or "authentication" in err or "401" in err:
                raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")
            raise HTTPException(status_code=502, detail="AI service error. Please try again.")

    raise HTTPException(status_code=429, detail="Too many requests. Please try again in a few seconds.")


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model sometimes adds."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def parse_resume(raw_text: str) -> dict:
    """Extract structured info from raw resume text."""
    system = (
        "You are an expert resume parser. Extract structured information from resumes. "
        "Always respond with valid JSON only — no markdown, no code fences, no commentary."
    )
    prompt = f"""Parse the following resume and return a JSON object with these keys:
- name (string)
- email (string)
- phone (string)
- summary (string)
- skills (array of strings)
- experience (array of objects: company, title, dates, bullets)
- education (array of objects: institution, degree, dates)
- certifications (array of strings)

Resume:
\"\"\"
{raw_text}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=2048)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"raw": result}


def generate_cover_letter(
    resume_text: str,
    job_description: str,
    company: str = "",
    role: str = "",
    tone: str = "professional",
) -> str:
    """Generate a tailored cover letter."""
    system = (
        "Du bist ein erfahrener Bewerbungscoach, der überzeugende, maßgeschneiderte Anschreiben auf Deutsch verfasst. "
        "Schreibe in der Ich-Form. Sei konkret — beziehe dich auf echte Details aus dem Lebenslauf und der Stellenbeschreibung. "
        "Vermeide generische Formulierungen. Schreibe auf Deutsch."
    )
    tone_instructions = {
        "professional": "formell und professionell",
        "enthusiastic": "warmherzig, dynamisch und leidenschaftlich",
        "concise": "knapp (unter 200 Wörter), prägnant und direkt",
    }
    tone_desc = tone_instructions.get(tone, "formell und professionell")

    prompt = f"""Verfasse ein {tone_desc}es Anschreiben auf Deutsch für folgende Bewerbung:

Unternehmen: {company or 'das Unternehmen'}
Stelle: {role or 'die ausgeschriebene Position'}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"

Gib nur den Text des Anschreibens aus, ohne Betreffzeile oder Metadaten.
"""
    return _call_groq(prompt, system=system, max_tokens=1024)


_CLOSING_MARKERS = [
    "mit freundlichen grüßen",
    "mit freundlichen grüssen",
    "hochachtungsvoll",
    "freundliche grüße",
    "freundlichem grüßen",
]


def _is_complete(text: str) -> bool:
    """Return True if the letter contains a recognisable closing formula."""
    lowered = text.lower()
    return any(marker in lowered for marker in _CLOSING_MARKERS)


def _ensure_complete(text: str, applicant_name: str = "") -> str:
    """If the letter was cut off before the closing, append a proper closing."""
    if _is_complete(text):
        return text
    name_line = f"\n{applicant_name}" if applicant_name else ""
    closing = (
        "\n\nÜber die Möglichkeit, mich in einem persönlichen Gespräch vorzustellen, "
        "würde ich mich sehr freuen und stehe Ihnen gerne für weitere Informationen zur Verfügung."
        "\n\nMit freundlichen Grüßen"
        f"{name_line}"
    )
    return text.rstrip() + closing


def generate_motivationsschreiben(
    resume_text: str,
    job_description: str,
    company: str = "",
    role: str = "",
    tone: str = "formell",
    applicant_name: str = "",
    applicant_address: str = "",
) -> str:
    """Generate an Austrian-style Motivationsschreiben in German."""
    system = (
        "Du bist ein erfahrener Bewerbungscoach in Österreich, der überzeugende "
        "Motivationsschreiben auf Deutsch verfasst. Du kennst die österreichischen "
        "Bewerbungsstandards und schreibst in einem professionellen, authentischen Stil. "
        "Das Schreiben soll den österreichischen Normen entsprechen: "
        "formelle Anrede (Sehr geehrte Damen und Herren / Sehr geehrte/r Frau/Herr ...), "
        "klare Struktur (Einleitung, Hauptteil mit Bezug auf Qualifikationen, Schluss), "
        "und eine höfliche Schlussformel (Mit freundlichen Grüßen). "
        "Verwende die Sie-Form. Beziehe dich konkret auf den Lebenslauf und die Stellenbeschreibung. "
        "Schreibe den Brief VOLLSTÄNDIG von Anfang bis Ende. Fasse NICHT zusammen. "
        "Du MUSST eine formelle Schlussformel ('Mit freundlichen Grüßen') und den Namen des Bewerbers am Ende einfügen."
    )
    tone_map = {
        "formell": "formell und professionell",
        "modern": "modern und dynamisch, aber respektvoll",
        "kreativ": "kreativ und individuell, aber seriös",
    }
    tone_desc = tone_map.get(tone, "formell und professionell")

    name_line = f"\nName des Bewerbers: {applicant_name}" if applicant_name else ""
    address_line = f"\nAdresse des Bewerbers: {applicant_address}" if applicant_address else ""
    _months_de = ["Jänner","Februar","März","April","Mai","Juni",
                  "Juli","August","September","Oktober","November","Dezember"]
    _d = date.today()
    today = f"{_d.day}. {_months_de[_d.month - 1]} {_d.year}"

    prompt = f"""Verfasse ein {tone_desc}es Motivationsschreiben auf Deutsch für folgende Bewerbung:

Unternehmen: {company or 'das Unternehmen'}
Stellenbezeichnung: {role or 'die ausgeschriebene Position'}{name_line}{address_line}
Heutiges Datum: {today}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"

WICHTIGE ANFORDERUNGEN:
1. Trenne jeden Absatz mit einer Leerzeile (zwei Zeilenumbrüche). Datum, Anrede, Einleitung, Hauptteil, Schluss und Grußformel sind jeweils eigene Absätze.
2. Höre NICHT auf, bevor du "Mit freundlichen Grüßen" und den Namen des Bewerbers geschrieben hast.
3. Der Schlussabsatz MUSS die Bereitschaft zu einem Vorstellungsgespräch erwähnen.
4. Gib nur den Text aus — kein Betreff, keine Metadaten.
5. Beginne mit Datum ({today}) und Ort, dann Absender, Empfänger, Betreffzeile und den eigentlichen Brief.
"""
    result = _call_groq(
        prompt,
        system=system,
        max_tokens=4096,
        temperature=0.4,
        frequency_penalty=0,
        presence_penalty=0,
    )
    return _ensure_complete(result, applicant_name)


def generate_company_research(company_name: str, job_description: str = "", known_data: dict = None) -> dict:
    """Generate a company briefing: summary, hot topics, smart questions."""
    known_info = ""
    if known_data:
        parts = []
        if known_data.get("ceo"):
            parts.append(f"CEO: {known_data['ceo']}")
        if known_data.get("mission"):
            parts.append(f"Mission: {known_data['mission']}")
        if known_data.get("industry"):
            parts.append(f"Branche: {known_data['industry']}")
        if known_data.get("employees"):
            parts.append(f"Mitarbeiter: {known_data['employees']}")
        if known_data.get("founded"):
            parts.append(f"Gegründet: {known_data['founded']}")
        if known_data.get("hq"):
            parts.append(f"Hauptsitz: {known_data['hq']}")
        known_info = "\n".join(parts)

    system = (
        "Du bist ein Karriere-Recherche-Assistent. "
        "Antworte AUSSCHLIESSLICH mit gültigem JSON — kein Markdown, keine Erklärungen. "
        "Alle Texte auf Deutsch. Jahr 2026."
    )
    prompt = f"""Erstelle ein Bewerbungs-Briefing für folgendes Unternehmen auf Deutsch.

Unternehmen: {company_name}
{f"Bekannte Daten:{chr(10)}{known_info}" if known_info else ""}
{f"Stellenbeschreibung:{chr(10)}{job_description[:800]}" if job_description else ""}

Gib exakt dieses JSON zurück:
{{
  "summary": "<2 prägnante Sätze über das Unternehmen, seine Stärken und Marktposition>",
  "contact_info": {{
    "email": "<allgemeine Recruiting- oder Karriere-E-Mail, sonst leer>",
    "phone": "<allgemeine Recruiting- oder Zentrale-Telefonnummer, sonst leer>",
    "location": "<relevanter Standort / Büro / Hauptsitz für Bewerbungen, sonst leer>",
    "website": "<offizielle Website oder Karriereseite, sonst leer>"
  }},
  "hot_topics": [
    "<Aktuelles Thema oder Trend 2026 das das Unternehmen betrifft>",
    "<Weiteres relevantes Thema oder Entwicklung 2026>"
  ],
  "smart_questions": [
    "<Intelligente Frage an den Recruiter zur Unternehmenskultur oder Rolle>",
    "<Frage zur Teamstruktur oder Wachstumsstrategie>",
    "<Frage zu Herausforderungen oder Zielen der Abteilung>"
  ]
}}"""
    result = _call_groq(prompt, system=system, max_tokens=800, temperature=0.5,
                        frequency_penalty=0, presence_penalty=0)
    try:
        return json.loads(_strip_code_fences(result))
    except json.JSONDecodeError:
        return {
            "summary": result,
            "contact_info": {},
            "hot_topics": [],
            "smart_questions": [],
        }


_SKILL_NAMES = {
    "tech": "Technische Fähigkeiten",
    "exp": "Berufserfahrung",
    "edu": "Ausbildung",
    "soft": "Soft Skills",
    "lang": "Sprachkenntnisse",
}


def analyze_resume_skills(raw_text: str, parsed_json: dict = None) -> dict:
    """Analyze resume and return per-category skill scores (0–100) + German summary."""
    system = (
        "Du bist ein erfahrener Karriere-Analyst. "
        "Antworte AUSSCHLIESSLICH mit gültigem JSON — kein Markdown, keine Erklärungen."
    )
    skills_hint = ""
    if parsed_json and parsed_json.get("skills"):
        skills_hint = f"\nExtrahierte Skills: {', '.join(parsed_json['skills'][:20])}"

    prompt = f"""Analysiere diesen Lebenslauf und bewerte ihn in 5 Kategorien auf einer Skala von 0–100.{skills_hint}

Kategorien:
- tech: Technische Fähigkeiten, Software, Tools, Programmiersprachen
- exp: Berufserfahrung, Projektumfang, Führung, Verantwortung
- edu: Ausbildung, Abschlüsse, Zertifikate, Weiterbildung
- soft: Soft Skills, Kommunikation, Teamarbeit, Leadership
- lang: Sprachkenntnisse (Anzahl und Niveau der Sprachen)

Strenge Bewertungsrichtlinien (sei konservativ):
- 0–20: Keine berufliche Relevanz — z.B. nur Babysitting, Kindergartenbetreuung, Hobbys
- 21–35: Sehr wenig oder kaum Nachweise
- 36–55: Erste Ansätze oder Grundkenntnisse
- 56–75: Gute Kenntnisse, mehrere Jahre relevante Erfahrung
- 76–90: Starke Qualifikation, breite Expertise
- 91–100: Experten-Niveau, langjährige tiefe Spezialisierung

Gib exakt dieses JSON zurück (kein "summary"-Feld):
{{
  "tech": <0-100>,
  "exp": <0-100>,
  "edu": <0-100>,
  "soft": <0-100>,
  "lang": <0-100>
}}

Lebenslauf:
\"\"\"
{raw_text[:3000]}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=256, temperature=0.2)
    try:
        data = json.loads(_strip_code_fences(result))
        scores = {k: max(0, min(100, int(data.get(k, 50)))) for k in _SKILL_NAMES}
        # Build summary from actual scores — never trust LLM to state numbers correctly
        best = max(scores, key=scores.__getitem__)
        worst = min(scores, key=scores.__getitem__)
        summary = f"Der stärkste Bereich ist {_SKILL_NAMES[best]} mit {scores[best]} Punkten."
        if worst != best:
            summary += f" Das größte Verbesserungspotenzial liegt in {_SKILL_NAMES[worst]} ({scores[worst]} Punkte)."
        scores["summary"] = summary
        return scores
    except (json.JSONDecodeError, ValueError):
        return {"tech": 50, "exp": 50, "edu": 50, "soft": 50, "lang": 50, "summary": "Analyse konnte nicht durchgeführt werden."}


def rate_interview_answer(
    question: str,
    user_answer: str,
    suggested_answer: str,
) -> dict:
    """Rate a user's practice answer against a reference and return structured feedback."""
    system = (
        "Du bist ein freundlicher Karriere-Coach für junge Erwachsene in Österreich. "
        "Dein Ton ist direkt, ermutigend und konstruktiv — kein akademisches Fachchinesisch. "
        "Antworte ausschließlich auf Deutsch. "
        "Antworte immer nur mit gültigem JSON — kein Markdown, keine Code-Blöcke, kein Kommentar."
    )
    prompt = f"""Bewerte die folgende Interviewantwort eines jungen Bewerbers.

Frage: {question}

Antwort des Nutzers:
\"\"\"{user_answer}\"\"\"

Referenzantwort (was gut wäre):
\"\"\"{suggested_answer}\"\"\"

Gib ein JSON-Objekt zurück mit diesen Feldern:
- score: NUR eines dieser drei Wörter: "stark" | "gut" | "ausbaufähig"
- strong: Array von 1-2 kurzen Strings — was konkret gut war (je max. 1 Satz, locker formuliert)
- improve: Array von 1-2 kurzen Strings — was besser sein könnte. Bei score="stark" leeres Array.
- tip: Ein einziger, konkreter Tipp für das nächste Mal (max. 1 Satz, beginnt mit einem Verb)

Regeln:
- Sei ehrlich aber nicht hart — der Nutzer ist 16-20 Jahre alt.
- Keine generischen Phrasen wie "Gute Antwort!" ohne Begründung.
- Fokussiere auf Inhalt, nicht auf Grammatik.
- Wenn die Antwort leer oder sinnlos ist, setze score="ausbaufähig" und tip="Versuch die Frage zu beantworten, auch wenn du dir nicht sicher bist."
"""
    result = _call_groq(prompt, system=system, max_tokens=512, temperature=0.4)
    try:
        data = json.loads(result)
        return {
            "score": data.get("score", "gut"),
            "strong": data.get("strong", []),
            "improve": data.get("improve", []),
            "tip": data.get("tip", ""),
        }
    except json.JSONDecodeError:
        return {"score": "gut", "strong": [], "improve": [], "tip": result[:200]}


def generate_interview_prep(
    resume_text: str,
    job_description: str,
    num_questions: int = 10,
) -> list[dict]:
    """Generate interview Q&A tailored to the resume and job."""
    system = (
        "Du bist ein erfahrener Interviewer, der hochspezifische, rollenrelevante Interviewfragen auf Deutsch erstellt. "
        "Antworte ausschließlich auf Deutsch. "
        "Antworte immer nur mit gültigem JSON — kein Markdown, keine Code-Blöcke, kein Kommentar."
    )
    prompt = f"""Erstelle {num_questions} Interviewfragen mit starken Beispielantworten auf Deutsch für einen Kandidaten, der sich auf diese Stelle bewirbt.
Mische verhaltensbasierte (STAR-Format), technische und situative Fragen.
Beziehe Antworten auf den tatsächlichen Lebenslauf des Kandidaten — sei konkret, nicht generisch.

Gib ein JSON-Array von Objekten zurück mit folgenden Schlüsseln:
- question (string: Frage auf Deutsch)
- type (string: NUR eines dieser deutschen Wörter: "Verhalten" | "Fachlich" | "Situativ" | "Motivation" | "Kompetenz" | "Führung" | "Teamarbeit" | "Kommunikation" | "Problemlösung")
- answer (string: starke Beispielantwort auf Deutsch basierend auf dem Lebenslauf)
- tip (string: kurzer Coaching-Tipp auf Deutsch für diese Frage)

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=4096)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return [{"question": "Could not parse", "type": "unknown", "answer": result, "tip": ""}]


async def suggest_courses_for_job(description: str, role: str = "", resume_text: str = "") -> list[dict]:
    """Generate 3-4 relevant online course suggestions for a job.

    Returns a list of dicts: {title, platform, duration?, url?}.
    """
    system = (
        "Du bist ein Karriereberater für österreichische Jugendliche (15–22 Jahre). "
        "Antworte AUSSCHLIESSLICH mit gültigem JSON — kein Markdown, kein Kommentar, nur das Array."
    )
    resume_section = f"\n\nLebenslauf des Bewerbers:\n\"\"\"\n{resume_text[:3000]}\n\"\"\"" if resume_text else ""
    prompt = f"""Schlage 3–4 konkrete Online-Kurse vor, die den Bewerber für folgende Stelle wettbewerbsfähiger machen.

Stelle: {role or "nicht angegeben"}
Stellenbeschreibung:
\"\"\"
{description[:4000]}
\"\"\"{resume_section}

Gib AUSSCHLIESSLICH ein JSON-Array zurück (kein Text davor oder danach):
[
  {{
    "title": "Konkreter Kursname",
    "platform": "Plattformname (YouTube / Coursera / Udemy / LinkedIn Learning / Khan Academy / OpenHPI)",
    "duration": "geschätzte Dauer (z.B. '4 Stunden', '3 Wochen')",
    "url": "PFLICHT — immer eine echte, klickbare URL angeben (siehe Regeln unten)"
  }}
]

URL-Regeln (WICHTIG — jeder Kurs MUSS eine URL haben):
- Wenn du die exakte Kurs-URL kennst: verwende sie direkt.
- Wenn nicht: baue eine Suchanfrage-URL nach diesem Muster:
  * YouTube:           https://www.youtube.com/results?search_query=SUCHBEGRIFF+tutorial
  * Udemy:             https://www.udemy.com/courses/search/?q=SUCHBEGRIFF
  * Coursera:          https://www.coursera.org/search?query=SUCHBEGRIFF
  * LinkedIn Learning: https://www.linkedin.com/learning/search?keywords=SUCHBEGRIFF
  * Khan Academy:      https://www.khanacademy.org/search?page_search_query=SUCHBEGRIFF
  Ersetze SUCHBEGRIFF durch passende englische oder deutsche Keywords (URL-codiert: Leerzeichen = +).
- "url": null ist VERBOTEN — jeder Eintrag braucht eine URL.
- Bevorzuge kostenlose Plattformen (YouTube, Coursera Audit, Khan Academy).
- Genau 3–4 Kurse. Kein Kommentar, nur JSON.
"""
    raw = _strip_code_fences(await call_groq_async(prompt, system=system, max_tokens=1024, temperature=0.4))
    try:
        result = json.loads(raw)
        if not isinstance(result, list):
            return []
        from urllib.parse import quote_plus
        cleaned = []
        for item in result[:4]:
            if not isinstance(item, dict):
                continue
            if not item.get("url"):
                query = quote_plus(f"{item.get('title', '')} tutorial")
                item["url"] = f"https://www.youtube.com/results?search_query={query}"
            cleaned.append(item)
        return cleaned
    except json.JSONDecodeError:
        return []


async def polish_text(text: str, context: str = "") -> str:
    """Improve a short text snippet (hobby line, bullet point, etc.) for use in
    an Austrian CV. Returns only the improved text — no explanations."""
    system = (
        "Du bist ein erfahrener österreichischer Lebenslauf-Experte. "
        "Wenn dir ein kurzer Text gegeben wird, verbesserst du ihn: "
        "klarer, prägnanter, aktive Formulierungen, keine Floskeln. "
        "Antworte NUR mit dem verbesserten Text — keine Erklärungen, kein Markdown, "
        "keine Anführungszeichen. Gleiche Sprache wie der Input."
    )
    context_line = f"\nKontext: {context}" if context else ""
    prompt = f"Verbessere diesen Lebenslauf-Text:{context_line}\n\n{text}"
    return await call_groq_async(prompt, system=system, max_tokens=512, temperature=0.4)
