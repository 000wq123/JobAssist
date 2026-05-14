import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)
    full_name: Optional[str] = Field(None, max_length=200)
    fingerprint: Optional[str] = Field(None, max_length=200)  # browser fingerprint for abuse prevention

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Passwort muss mindestens 8 Zeichen lang sein")
        if not any(c.isupper() for c in v):
            raise ValueError("Passwort muss mindestens einen Großbuchstaben enthalten")
        if not any(c.islower() for c in v):
            raise ValueError("Passwort muss mindestens einen Kleinbuchstaben enthalten")
        if not any(c.isdigit() for c in v):
            raise ValueError("Passwort muss mindestens eine Zahl enthalten")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    is_verified: bool = False
    created_at: datetime
    currency: str = "USD"
    location: str = "United States"
    language: str = "en"

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserPreferencesUpdate(BaseModel):
    currency: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}", value):
            raise ValueError("Währung muss ein 3-stelliger ISO-Code wie EUR oder USD sein")
        return value

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip()
        if not value:
            raise ValueError("Standort darf nicht leer sein")
        if len(value) > 120:
            raise ValueError("Standort darf maximal 120 Zeichen lang sein")
        return value

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip().lower()
        if value not in {"de", "en"}:
            raise ValueError("Sprache muss 'de' oder 'en' sein")
        return value

    model_config = {"from_attributes": True}
