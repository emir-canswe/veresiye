import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Önce Render'daki Environment Variable'dan URL'yi çekmeye çalışıyoruz
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Eğer Render'daysak (URL varsa), formatı düzeltiyoruz
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Eğer URL yoksa (yani kendi bilgisayarındaysan), eski yerel adresini kullan
if not DATABASE_URL:
    DATABASE_URL = "postgresql://veresiye_user:veresiye_pass@localhost:5433/veresiye_db"

# Engine artık dinamik olarak doğru adrese bağlanacak
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()