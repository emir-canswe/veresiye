import pytest

from main import _DEV_SECRET_DEFAULT, validate_production_secrets


def test_validate_production_accepts_strong_secret(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "x" * 32)
    validate_production_secrets()


def test_validate_production_rejects_default_dev_secret(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("SECRET_KEY", _DEV_SECRET_DEFAULT)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        validate_production_secrets()


def test_validate_production_rejects_empty_secret(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        validate_production_secrets()


def test_validate_skipped_when_not_production(monkeypatch):
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.setenv("SECRET_KEY", _DEV_SECRET_DEFAULT)
    validate_production_secrets()
