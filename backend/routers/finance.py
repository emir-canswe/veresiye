from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.models import Transaction, TransactionType, PaymentMethod
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from datetime_util import utc_now

router = APIRouter(prefix="/finance", tags=["Gelir/Gider"])

class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = PaymentMethod.nakit
    customer_id: Optional[int] = None

@router.get("/")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).order_by(Transaction.date.desc()).all()

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    toplam_gelir = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == TransactionType.gelir
    ).scalar() or 0
    toplam_gider = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == TransactionType.gider
    ).scalar() or 0
    return {
        "toplam_gelir": toplam_gelir,
        "toplam_gider": toplam_gider,
        "net_kar": toplam_gelir - toplam_gider
    }

@router.post("/")
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    tx = Transaction(
        type=data.type,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=data.date or utc_now(),
        payment_method=data.payment_method,
        customer_id=data.customer_id
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    db.delete(tx)
    db.commit()
    return {"message": "İşlem silindi"}