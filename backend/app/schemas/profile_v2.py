"""Pydantic schemas for ProfileV2 (Austrian CV builder)."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CVExperience(BaseModel):
    id: str
    art: str
    titel: str
    organisation: str
    von: str
    bis: str
    bullets: list[str]


class CVLanguage(BaseModel):
    sprache: str
    niveau: str


class CVWeiterbildung(BaseModel):
    name: str
    institution: str
    jahr: str


class CVAktivitaet(BaseModel):
    name: str
    organisation: str
    beschreibung: str
    von: str
    bis: str


class ProfileV2Update(BaseModel):
    model_config = {"extra": "ignore"}

    vorname: Optional[str] = None
    nachname: Optional[str] = None
    geburtsdatum: Optional[date] = None
    geburtsort: Optional[str] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    telefon: Optional[str] = None
    email_kontakt: Optional[str] = None
    staatsbuergerschaft: Optional[str] = None
    arbeitserlaubnis: Optional[bool] = None
    schulname: Optional[str] = None
    schultyp: Optional[str] = None
    klasse: Optional[str] = None
    abschlussjahr: Optional[int] = None
    erfahrungen: Optional[list] = None
    sprachkenntnisse: Optional[list] = None
    faehigkeiten: Optional[list[str]] = None
    hobbies: Optional[str] = None
    foto_url: Optional[str] = None
    profil: Optional[str] = None
    fuehrerschein: Optional[str] = None
    jobArten: Optional[list[str]] = None
    maxAnfahrtMin: Optional[int] = None
    branchen: Optional[list[str]] = None
    verfuegbarAb: Optional[str] = None
    weiterbildungen: Optional[list] = None
    aktivitaeten: Optional[list] = None
    templateId: Optional[str] = None


class ProfileV2Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    vorname: Optional[str]
    nachname: Optional[str]
    geburtsdatum: Optional[date]
    geburtsort: Optional[str]
    strasse: Optional[str]
    plz: Optional[str]
    ort: Optional[str]
    telefon: Optional[str]
    email_kontakt: Optional[str]
    staatsbuergerschaft: str
    arbeitserlaubnis: Optional[bool]
    schulname: Optional[str]
    schultyp: Optional[str]
    klasse: Optional[str]
    abschlussjahr: Optional[int]
    erfahrungen: list
    sprachkenntnisse: list
    faehigkeiten: list[str]
    hobbies: Optional[str]
    foto_url: Optional[str]
    profil: Optional[str]
    fuehrerschein: Optional[str]
    jobArten: list[str]
    maxAnfahrtMin: Optional[int]
    branchen: list[str]
    verfuegbarAb: Optional[str]
    weiterbildungen: list
    aktivitaeten: list
    templateId: Optional[str]
    completion_pct: int
    created_at: datetime
    updated_at: datetime
