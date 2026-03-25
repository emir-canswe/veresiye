from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models.models import Base
from routers import customers, debts, payments, dashboard, bank
from routers import auth, backup, stock, finance

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TahsilatPro API", version="2.0.0")

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
app.include_router(stock.router)
app.include_router(finance.router)

@app.get("/")
def root():
    return {"message": "TahsilatPro API calisiyor"}