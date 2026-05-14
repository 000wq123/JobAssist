import types

from app.core import monitoring


def test_configure_sentry_returns_false_without_dsn():
    assert monitoring.configure_sentry("", 0.0) is False


def test_configure_sentry_returns_false_when_sdk_missing(monkeypatch):
    original_import = __import__

    def fake_import(name, *args, **kwargs):
        if name == "sentry_sdk" or name.startswith("sentry_sdk."):
            raise ImportError("missing")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", fake_import)
    assert monitoring.configure_sentry("https://example@sentry.invalid/1", 0.1) is False


def test_configure_sentry_initializes_sdk(monkeypatch):
    calls = {}

    fake_sdk = types.SimpleNamespace(
        init=lambda **kwargs: calls.update(kwargs),
    )
    fake_fastapi = types.SimpleNamespace(FastApiIntegration=lambda: "fastapi")
    fake_sqlalchemy = types.SimpleNamespace(SqlalchemyIntegration=lambda: "sqlalchemy")

    def fake_import(name, *args, **kwargs):
        if name == "sentry_sdk":
            return fake_sdk
        if name == "sentry_sdk.integrations.fastapi":
            return fake_fastapi
        if name == "sentry_sdk.integrations.sqlalchemy":
            return fake_sqlalchemy
        return __import__(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", fake_import)
    assert monitoring.configure_sentry("https://example@sentry.invalid/1", 0.25) is True
    assert calls["dsn"] == "https://example@sentry.invalid/1"
    assert calls["traces_sample_rate"] == 0.25
    assert calls["integrations"] == ["fastapi", "sqlalchemy"]
