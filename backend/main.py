import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models.models import Base
from routers import customers, debts, payments, dashboard, bank
from routers import auth, backup, stock, finance, notifications

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TahsilatPro API", version="2.0.0")

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

@app.get("/")
def root():
    return {"message": "TahsilatPro API calisiyor"}