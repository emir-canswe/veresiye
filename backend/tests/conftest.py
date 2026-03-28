"""
Pytest ortamı: gerçek PostgreSQL yerine bellek içi SQLite kullanılır.
DATABASE_URL, database modülü import edilmeden önce atanır; dotenv mevcut env değişkenlerini ezmez.
"""
import os

os.environ.setdefault("SECRET_KEY", "pytest-secret-key")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")

import pytest
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(autouse=True)
def _fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
