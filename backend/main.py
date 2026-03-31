import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import SessionLocal, engine
from models.models import Base
from routers import customers, debts, payments, dashboard, bank
from routers import auth, backup, stock, finance, notifications, company

Base.metadata.create_all(bind=engine)

_DEV_SECRET_DEFAULT = "dev-only-insecure-set-secret-key-in-env"


def validate_production_secrets() -> None:
    """Üretimde güçlü SECRET_KEY zorunluluğu (routers.auth varsayılanı ile aynı metin)."""
    env = os.getenv("ENV", "").strip().lower()
    if env not in ("production", "prod"):
        return
    sk = (os.getenv("SECRET_KEY") or "").strip()
    if not sk or sk == _DEV_SECRET_DEFAULT:
        raise RuntimeError(
            "ENV=production iken SECRET_KEY ortam değişkeni zorunludur ve "
            "geliştirme varsayılanı kullanılamaz."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_secrets()
    yield


app = FastAPI(title="TahsilatPro API", version="2.1.0", lifespan=lifespan)

_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,null",
).strip()
if _cors_raw == "*":
    _allow_origins = ["*"]
else:
    _allow_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(debts.router)
app.include_router(payments.router)
app.include_router(dashboard.router)
app.include_router(bank.router)
app.include_router(backup.router)
app.include_router(stock.router)
app.include_router(finance.router)
app.include_router(notifications.router)
app.include_router(company.router)


@app.get("/")
def root():
    return {"message": "TahsilatPro API calisiyor", "version": "2.1.0"}


@app.get("/health")
def health():
    ok = True
    detail = {}
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            detail["database"] = "ok"
        finally:
            db.close()
    except Exception as e:
        ok = False
        detail["database"] = f"error: {e!s}"
    return {"status": "ok" if ok else "degraded", "detail": detail}