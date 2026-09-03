"""PostgreSQL-only checks for request-scoped AsyncSession behavior."""
import json
import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes.health import init
from app.models.user import User


@pytest.mark.asyncio
async def test_init_uses_one_postgres_session_without_concurrent_operations():
    database_url = os.getenv("TEST_POSTGRES_URL")
    if not database_url:
        pytest.skip("TEST_POSTGRES_URL is not configured")

    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    email = f"postgres-session-{uuid4().hex}@example.com"
    user_id: int | None = None
    try:
        async with session_factory() as session:
            user = User(
                email=email,
                hashed_password="not-used-in-this-test",
                full_name="Postgres Session Test",
                is_verified=True,
                currency="EUR",
                location="Wien",
                language="de",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_id = user.id

            response = await init(
                request=SimpleNamespace(
                    state=SimpleNamespace(request_id="postgres-test"),
                    headers={},
                ),
                db=session,
                current_user=user,
            )
            payload = json.loads(response.body)

            assert payload["me"]["id"] == user.id
            assert payload["resumes"] == []
            assert payload["jobs_total"] == 0
            assert {item["feature"] for item in payload["usage"]} == {
                "cv_analysis",
                "cover_letter",
                "job_alerts",
                "ai_chat",
                "job_search",
            }
    finally:
        if user_id is not None:
            async with session_factory() as session:
                await session.execute(delete(User).where(User.id == user_id))
                await session.commit()
        await engine.dispose()
