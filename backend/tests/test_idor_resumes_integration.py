import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import sys
import types
if 'pypdf' not in sys.modules:
    sys.modules['pypdf'] = types.SimpleNamespace(PdfReader=object)

from app.api.routes import auth, resume as resume_routes
from app.core import security
from app.core.database import Base, get_db
from app.models import job as _job_model  # noqa: F401
from app.models import job_alert as _job_alert_model  # noqa: F401
from app.models import refresh_token as _refresh_token_model  # noqa: F401
from app.models import resume as _resume_model  # noqa: F401
from app.models import subscription as _subscription_model  # noqa: F401
from app.models import usage as _usage_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.models import user_profile as _user_profile_model  # noqa: F401
from app.models.resume import Resume


@pytest_asyncio.fixture
async def idor_resume_env(tmp_path, monkeypatch):
    db_path = tmp_path / "idor_resume.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app = FastAPI()
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(resume_routes.router, prefix="/api/resume", tags=["Resume"])
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[security.get_db] = override_get_db

    monkeypatch.setattr(auth, "send_verification_email", lambda email, token: None)
    monkeypatch.setattr(auth, "send_password_reset_email", lambda email, token: None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield {
            "client": client,
            "session_factory": session_factory,
        }

    await engine.dispose()


async def _register_user(client: AsyncClient, email: str):
    response = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password1", "full_name": "User"},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_resumes_idor_blocked(idor_resume_env):
    client = idor_resume_env["client"]
    session_factory = idor_resume_env["session_factory"]

    a_tokens = await _register_user(client, email="a@example.com")
    b_tokens = await _register_user(client, email="b@example.com")

    async with session_factory() as session:
        from app.models.user import User
        user_a = (await session.execute(select(User).where(User.email == "a@example.com"))).scalar_one()
        r = Resume(
            user_id=user_a.id,
            filename="resume.txt",
            raw_text="Hello world",
            parsed_json="{}",
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)
        resume_id = r.id

    get_other = await client.get(
        f"/api/resume/{resume_id}",
        headers={"Authorization": f"Bearer {b_tokens['access_token']}"},
    )
    assert get_other.status_code == 404

    analyze_other = await client.post(
        f"/api/resume/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {b_tokens['access_token']}"},
    )
    assert analyze_other.status_code == 404

    del_other = await client.delete(
        f"/api/resume/{resume_id}",
        headers={"Authorization": f"Bearer {b_tokens['access_token']}"},
    )
    assert del_other.status_code == 404

    list_b = await client.get(
        "/api/resume/",
        headers={"Authorization": f"Bearer {b_tokens['access_token']}"},
    )
    assert list_b.status_code == 200
    items = list_b.json()
    assert isinstance(items, list)
    assert all(item.get("id") != resume_id for item in items)
