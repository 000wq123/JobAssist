from pathlib import Path
import tomllib


def test_railway_applies_migrations_before_starting_workers():
    config_path = Path(__file__).resolve().parents[1] / "railway.toml"
    config = tomllib.loads(config_path.read_text(encoding="utf-8"))
    deploy = config["deploy"]
    start_command = deploy["startCommand"]

    assert "alembic upgrade head" in start_command
    assert "gunicorn app.main:app" in start_command
    assert "stamp head" not in start_command
    assert "preDeployCommand" not in deploy


def test_migrations_do_not_embed_postgresql_only_json_casts():
    versions_dir = Path(__file__).resolve().parents[1] / "alembic" / "versions"

    for migration in versions_dir.glob("*.py"):
        assert "::json" not in migration.read_text(encoding="utf-8"), migration.name
