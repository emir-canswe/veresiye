from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.models import Debt, Payment
from schemas.schemas import DashboardOut
from datetime import datetime, date

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    toplam_alacak = db.query(func.sum(Debt.amount)).scalar() or 0
    toplam_tahsilat = db.query(func.sum(Payment.amount)).scalar() or 0
    bugun = date.today()
    bugun_tahsilat = db.query(func.sum(Payment.amount)).filter(
        func.date(Payment.date) == bugun
    ).scalar() or 0
    return DashboardOut(
        toplam_alacak=toplam_alacak,
        toplam_tahsilat=toplam_tahsilat,
        bugun_tahsilat=bugun_tahsilat,
        bekleyen_borc=toplam_alacak - toplam_tahsilat
    )