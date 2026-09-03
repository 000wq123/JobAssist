from datetime import datetime, timedelta, timezone
import secrets
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
import jwt
from jwt import PyJWTError as JWTError
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_cookies import clear_refresh_cookie, read_refresh_cookie, set_refresh_cookie
from app.core.config import settings
from app.core.database import get_db
from app.core.email_validation import is_allowed_email
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.rate_limit import limiter
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.core.user_data import DELETE_USER_DATA_MODELS, EXPORT_DATA_SPECS
from app.schemas.user import Token, UserCreate, UserLogin, UserOut
from app.services.email_service import send_password_reset_email, send_verification_email

logger = logging.getLogger(__name__)
router = APIRouter()


def _create_email_token(
    user_id: int,
    purpose: str,
    expires_minutes: int,
    *,
    nonce: str | None = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    claims = {
        "sub": str(user_id),
        "purpose": purpose,
        "token_use": "email_action",
        "exp": expire,
    }
    if nonce is not None:
        claims["nonce"] = nonce
    return jwt.encode(
        claims,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _decode_email_token(token: str, expected_purpose: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if (
            payload.get("token_use") != "email_action"
            or payload.get("purpose") != expected_purpose
        ):
            raise HTTPException(status_code=400, detail="Ungültiger Token")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Ungültiger Token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=400, detail="Token ist ungültig oder abgelaufen")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    response: Response,
    payload: UserCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Token:
    if not is_allowed_email(payload.email):
        raise HTTPException(
            status_code=400,
            detail="Bitte verwende eine gültige E-Mail-Adresse (z.B. Gmail, Outlook, iCloud)",
        )

    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Diese E-Mail-Adresse ist bereits registriert")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_email_token(user.id, "verify", expires_minutes=1440)
    bg.add_task(send_verification_email, user.email, token)

    access_token = create_access_token(
        {"sub": str(user.id), "auth_version": getattr(user, "auth_version", 0)}
    )
    raw_refresh, refresh_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()

    set_refresh_cookie(response, raw_refresh)
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail-Adresse oder Passwort",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Konto ist deaktiviert")

    # Allow up to 2 concurrent sessions (e.g., phone + laptop).
    # Keep the most recent existing active token and prune older ones.
    now = datetime.now(timezone.utc)
    existing_res = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
        .order_by(RefreshToken.created_at.desc())
    )
    existing = existing_res.scalars().all()
    # Filter out expired tokens and revoke extras beyond the newest one
    kept = 0
    for rt in existing:
        expires = rt.expires_at
        if expires is not None and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires and expires <= now:
            rt.revoked = True
            continue
        if kept >= 1:
            rt.revoked = True
        else:
            kept += 1

    access_token = create_access_token(
        {"sub": str(user.id), "auth_version": getattr(user, "auth_version", 0)}
    )
    raw_refresh, refresh_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()

    set_refresh_cookie(response, raw_refresh)
    return Token(access_token=access_token)


class RefreshRequest(BaseModel):
    # Optional: legacy clients may still send the token in the body.
    # Preferred: send no body and rely on the httpOnly cookie.
    refresh_token: str | None = None


@router.post("/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    payload: RefreshRequest | None = None,
) -> Token:
    # Cookie takes precedence over body so a legacy client that still sends
    # the token in JSON cannot accidentally refresh someone else's session.
    raw = read_refresh_cookie(request) or (payload.refresh_token if payload else None)
    if not raw:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    token_hash = hash_refresh_token(raw)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    rt = result.scalar_one_or_none()

    expires = rt.expires_at if rt else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not rt or expires < datetime.now(timezone.utc):
        # Always clear the cookie on rejection so the SPA falls back to login.
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # The refresh token may survive the user row (e.g. a DB swap/restore that
    # re-seeded other tables but not `users`). Minting an access token for a
    # deleted user produces a token that passes signature checks but fails
    # get_current_user, which makes the SPA loop on 401 forever. Reject and
    # revoke the token instead so the client falls back to login cleanly.
    user = await db.get(User, rt.user_id)
    if user is None:
        rt.revoked = True
        await db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Non-rotating refresh: issue a fresh access token but keep the same
    # refresh token. Rotating here caused a multi-tab race — two tabs share one
    # `ja_refresh` cookie, and if both refresh concurrently one would revoke the
    # token the other just saw, then the loser hits the revoked path and clears
    # the cookie, logging the user out. Keeping the refresh token stable makes
    # `/refresh` idempotent and concurrent-safe. Security is preserved by the
    # httpOnly + Secure + SameSite cookie, the 2-session cap at login, and the
    # explicit revoke on logout / password reset.
    access_token = create_access_token(
        {"sub": str(rt.user_id), "auth_version": getattr(user, "auth_version", 0)}
    )
    return Token(access_token=access_token)


@router.post("/logout", status_code=204)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    payload: RefreshRequest | None = None,
) -> None:
    raw = read_refresh_cookie(request) or (payload.refresh_token if payload else None)
    # Always clear the cookie, even if the token was already revoked or absent.
    clear_refresh_cookie(response)
    if not raw:
        return
    token_hash = hash_refresh_token(raw)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.commit()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
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


@router.post("/verify-email", status_code=200)
@limiter.limit("10/minute")
async def verify_email(request: Request, payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    user_id = _decode_email_token(payload.token, "verify")
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    user.is_verified = True
    await db.commit()
    return {"message": "E-Mail erfolgreich bestätigt"}


@router.post("/resend-verification", status_code=200)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    bg: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if current_user.is_verified:
        return {"message": "E-Mail bereits bestätigt"}
    token = _create_email_token(current_user.id, "verify", expires_minutes=1440)
    bg.add_task(send_verification_email, current_user.email, token)
    return {"message": "Bestätigungs-E-Mail gesendet"}


@router.post("/resend-verification-public", status_code=200)
@limiter.limit("3/minute")
async def resend_verification_public(
    request: Request,
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user and not user.is_verified:
        token = _create_email_token(user.id, "verify", expires_minutes=1440)
        bg.add_task(send_verification_email, user.email, token)
    return {
        "message": "Falls ein unverifiziertes Konto mit dieser E-Mail existiert, wurde eine Bestätigungs-E-Mail gesendet"
    }


@router.post("/forgot-password", status_code=200)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user:
        nonce = secrets.token_urlsafe(32)
        user.password_reset_nonce = nonce
        await db.commit()
        token = _create_email_token(
            user.id,
            "reset",
            expires_minutes=60,
            nonce=nonce,
        )
        bg.add_task(send_password_reset_email, user.email, token)
    return {"message": "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet"}


@router.post("/reset-password", status_code=200)
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    user_id = _decode_email_token(payload.token, "reset")
    try:
        token_payload = jwt.decode(
            payload.token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        raise HTTPException(status_code=400, detail="Token ist ungültig oder abgelaufen")
    nonce = token_payload.get("nonce")
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    if not nonce or not secrets.compare_digest(nonce, user.password_reset_nonce or ""):
        raise HTTPException(status_code=400, detail="Token ist ungültig oder wurde bereits verwendet")
    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_nonce = None
    user.auth_version += 1
    await db.execute(sa_delete(RefreshToken).where(RefreshToken.user_id == user.id))
    await db.commit()
    return {"message": "Passwort erfolgreich zurückgesetzt"}


@router.get("/export-data")
@limiter.limit("2/hour")
async def export_account_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """GDPR Art. 20 (data portability) export.

    Returns a JSON document containing every piece of data we hold for the
    authenticated user, excluding security credentials (hashed password,
    refresh-token hashes). Rate-limited so this can't be used as a
    denial-of-service vector.

    The response is served as an attachment so browsers prompt for download.
    """
    from datetime import date as _date, datetime as _dt
    from fastapi.responses import JSONResponse as _JSONResponse
    from sqlalchemy import inspect as _sa_inspect

    def _serialize(obj) -> dict:
        """Best-effort SQLAlchemy row → JSON-safe dict."""
        if obj is None:
            return {}
        out: dict = {}
        for attribute in _sa_inspect(obj).mapper.column_attrs:
            value = getattr(obj, attribute.key, None)
            if isinstance(value, (_date, _dt)):
                value = value.isoformat()
            out[attribute.key] = value
        return out

    user_dict = _serialize(current_user)
    # Never export credentials, even hashed.
    user_dict.pop("hashed_password", None)
    user_dict.pop("password_reset_nonce", None)

    payload = {
        "export_version": 2,
        "exported_at": _dt.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "user": user_dict,
        "security_credentials_excluded": [
            "hashed_password",
            "password_reset_nonce",
            "refresh_token_hashes",
        ],
    }
    for spec in EXPORT_DATA_SPECS:
        result = await db.execute(
            select(spec.model).where(spec.model.user_id == current_user.id)
        )
        rows = result.scalars().all()
        payload[spec.key] = (
            [_serialize(row) for row in rows]
            if spec.many
            else (_serialize(rows[0]) if rows else None)
        )

    logger.info(
        "gdpr.export",
        extra={"user_id": current_user.id, "request_id": getattr(request.state, "request_id", "-")},
    )

    filename = f"jobassist-export-{current_user.id}-{_dt.now(timezone.utc).strftime('%Y%m%d')}.json"
    return _JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class DeleteAccountRequest(BaseModel):
    password: str


@router.post("/delete-account", status_code=200)
@limiter.limit("3/minute")
async def delete_account(
    request: Request,
    payload: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Passwort ist nicht korrekt")

    try:
        for model in DELETE_USER_DATA_MODELS:
            await db.execute(sa_delete(model).where(model.user_id == current_user.id))
        await db.execute(sa_delete(User).where(User.id == current_user.id))
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Account deletion failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Konto konnte nicht gelöscht werden")
    return {"message": "Konto und alle Daten wurden gelöscht"}
