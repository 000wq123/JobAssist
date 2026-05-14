import asyncio
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
import re

from app.core.security import get_current_user
from app.core.usage import require_usage
from app.models.user import User
from app.services.claude_service import generate_company_research
from app.services.job_search import _find_contact_email
from app.core.rate_limit import limiter

router = APIRouter()

# Known Austrian & international company data for instant enrichment
_KNOWN_COMPANIES: dict[str, dict] = {
    "allianz": {
        "ceo": "Oliver Bäte",
        "mission": "We secure your future — leading global insurer with a focus on sustainability and digital transformation.",
        "industry": "Versicherung & Finanzdienstleistungen",
        "employees": "~150.000 weltweit",
        "founded": "1890",
        "hq": "München / Wien",
    },
    "omv": {
        "ceo": "Alfred Stern",
        "mission": "Turning resources into value for a sustainable future — integrated oil, gas & chemicals company.",
        "industry": "Energie & Chemie",
        "employees": "~22.000 weltweit",
        "founded": "1956",
        "hq": "Wien, Österreich",
    },
    "erste bank": {
        "ceo": "Peter Bosek",
        "mission": "Banking for a better life — empowering communities across Central & Eastern Europe.",
        "industry": "Bankwesen",
        "employees": "~50.000 in CEE",
        "founded": "1819",
        "hq": "Wien, Österreich",
    },
    "erste": {
        "ceo": "Peter Bosek",
        "mission": "Banking for a better life — empowering communities across Central & Eastern Europe.",
        "industry": "Bankwesen",
        "employees": "~50.000 in CEE",
        "founded": "1819",
        "hq": "Wien, Österreich",
    },
    "raiffeisen": {
        "ceo": "Johann Strobl",
        "mission": "Stark. Verlässlich. Österreichisch — regional banking with European reach.",
        "industry": "Bankwesen & Finanzdienstleistungen",
        "employees": "~45.000 in CEE",
        "founded": "1886",
        "hq": "Wien, Österreich",
    },
    "bawag": {
        "ceo": "Anas Abuzaakouk",
        "mission": "Simple, transparent, better banking for every customer.",
        "industry": "Bankwesen",
        "employees": "~4.500",
        "founded": "1922",
        "hq": "Wien, Österreich",
    },
    "uniqa": {
        "ceo": "Andreas Brandstetter",
        "mission": "Versicherung neu denken — customer-centric, digital-first insurance.",
        "industry": "Versicherung",
        "employees": "~15.000 in CEE",
        "founded": "1811",
        "hq": "Wien, Österreich",
    },
    "voestalpine": {
        "ceo": "Herbert Eibensteiner",
        "mission": "Technology and industrial goods company — steel solutions for mobility and energy.",
        "industry": "Stahl & Technologie",
        "employees": "~50.000 weltweit",
        "founded": "1938",
        "hq": "Linz, Österreich",
    },
    "red bull": {
        "ceo": "Franz Watzlawick",
        "mission": "Giving wings to people and ideas — iconic energy drink brand and media empire.",
        "industry": "FMCG / Getränke / Medien",
        "employees": "~16.000 weltweit",
        "founded": "1984",
        "hq": "Fuschl am See, Österreich",
    },
    "siemens": {
        "ceo": "Roland Busch",
        "mission": "Technology for sustainability — automation, digitalization and smart infrastructure.",
        "industry": "Technologie & Industrie",
        "employees": "~320.000 weltweit",
        "founded": "1847",
        "hq": "München / Wien (AT Niederlassung)",
    },
    "pwc": {
        "ceo": "Mohamed Kande (Global)",
        "mission": "Building trust in society and solving important problems for clients and communities.",
        "industry": "Wirtschaftsprüfung & Beratung",
        "employees": "~370.000 weltweit",
        "founded": "1849",
        "hq": "London / Wien (AT Niederlassung)",
    },
    "deloitte": {
        "ceo": "Joe Ucuzoglu (Global)",
        "mission": "Making an impact that matters — audit, consulting, tax and advisory services.",
        "industry": "Wirtschaftsprüfung & Beratung",
        "employees": "~460.000 weltweit",
        "founded": "1845",
        "hq": "London / Wien (AT Niederlassung)",
    },
    "wiener linien": {
        "ceo": "Alexandra Reinagl",
        "mission": "Wien bewegen — reliable, sustainable public transport for Vienna.",
        "industry": "Öffentlicher Nahverkehr",
        "employees": "~8.700",
        "founded": "1865",
        "hq": "Wien, Österreich",
    },
    "spar": {
        "ceo": "Fritz Poppmeier",
        "mission": "Frisch. Regional. Nah — Austria's leading supermarket chain with sustainability focus.",
        "industry": "Lebensmittelhandel",
        "employees": "~90.000 in Österreich",
        "founded": "1953",
        "hq": "Salzburg, Österreich",
    },
    "amazon": {
        "ceo": "Andy Jassy",
        "mission": "To be Earth's most customer-centric company and best employer.",
        "industry": "E-Commerce & Cloud (AWS)",
        "employees": "~1.500.000 weltweit",
        "founded": "1994",
        "hq": "Seattle / Wien (AT Niederlassung)",
    },
    "google": {
        "ceo": "Sundar Pichai",
        "mission": "To organize the world's information and make it universally accessible.",
        "industry": "Technologie / KI / Cloud",
        "employees": "~180.000 weltweit",
        "founded": "1998",
        "hq": "Mountain View / Wien (AT Büro)",
    },
}


def _lookup_company(company_name: str) -> dict:
    name_lower = company_name.lower()
    for key, data in _KNOWN_COMPANIES.items():
        if key in name_lower:
            return data
    return {}


def _guess_company_website(company_name: str, email: str = "") -> str:
    if email and "@" in email and not email.endswith("@unternehmen.at"):
        return f"https://{email.split('@', 1)[1]}"

    slug = re.sub(r"[^a-z0-9]", "", (company_name or "").lower())
    if slug:
        return f"https://www.{slug}.at"
    return ""


class ResearchRequest(BaseModel):
    company_name: str = Field(..., max_length=300)
    job_description: Optional[str] = Field("", max_length=10000)


class ResearchResponse(BaseModel):
    company_name: str
    known_data: dict
    summary: str
    contact_info: dict
    hot_topics: list[str]
    smart_questions: list[str]


@router.post("/", response_model=ResearchResponse)
@limiter.limit("10/minute")
async def research_company(
    request: Request,
    payload: ResearchRequest,
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
) -> ResearchResponse:
    known = _lookup_company(payload.company_name)
    briefing = await asyncio.to_thread(
        generate_company_research,
        payload.company_name,
        payload.job_description or "",
        known,
    )
    contact_info = briefing.get("contact_info", {}) or {}
    email = contact_info.get("email") or _find_contact_email(
        payload.company_name,
        payload.job_description or "",
    )
    contact_info = {
        "email": "" if email == "bewerbung@unternehmen.at" else email,
        "phone": contact_info.get("phone", ""),
        "location": contact_info.get("location") or known.get("hq", ""),
        "website": contact_info.get("website") or _guess_company_website(payload.company_name, email),
    }
    return ResearchResponse(
        company_name=payload.company_name,
        known_data=known,
        summary=briefing.get("summary", ""),
        contact_info=contact_info,
        hot_topics=briefing.get("hot_topics", []),
        smart_questions=briefing.get("smart_questions", []),
    )
