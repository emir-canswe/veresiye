from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.models import Debt, Payment, Customer
from schemas.schemas import DashboardOut
from datetime import datetime, date

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    # Tüm borçlar
    toplam_alacak = db.query(func.sum(Debt.amount)).scalar() or 0
    # Tüm ödemeler
    toplam_tahsilat = db.query(func.sum(Payment.amount)).scalar() or 0
    # Bekleyen = borç - ödeme (eksi olmamalı)
    bekleyen_borc = max(0, toplam_alacak - toplam_tahsilat)

    bugun = date.today()
    bugun_tahsilat = db.query(func.sum(Payment.amount)).filter(
        func.date(Payment.date) == bugun
    ).scalar() or 0

    return DashboardOut(
        toplam_alacak=toplam_alacak,
        toplam_tahsilat=toplam_tahsilat,
        bugun_tahsilat=bugun_tahsilat,
        bekleyen_borc=bekleyen_borc
    )