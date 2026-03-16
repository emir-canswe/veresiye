from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models.models import Base
from routers import customers, debts, payments, dashboard, bank
from routers import auth, backup

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Veresiye API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
def root():
    return {"message": "Veresiye API calisiyor"}