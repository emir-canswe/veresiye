import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# 1. Önce Render'daki Environment Variable'dan URL'yi çekmeye çalışıyoruz
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Eğer Render'daysak (URL varsa), formatı düzeltiyoruz
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Eğer URL yoksa (yani kendi bilgisayarındaysan), eski yerel adresini kullan
if not DATABASE_URL:
    DATABASE_URL = "postgresql://veresiye_user:veresiye_pass@localhost:5433/veresiye_db"

# SQLite (ör. pytest) için tek bellek havuzu — aksi halde :memory: her bağlantıda boş DB olur
_connect_args = {}
_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy.pool import StaticPool

    _connect_args["check_same_thread"] = False
    _engine_kwargs["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()