from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Payment, Customer
from schemas.schemas import PaymentCreate, PaymentOut
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["Ödemeler"])

@router.get("/", response_model=list[PaymentOut])
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).order_by(Payment.date.desc()).all()

@router.get("/customer/{customer_id}", response_model=list[PaymentOut])
def get_customer_payments(customer_id: int, db: Session = Depends(get_db)):
    return db.query(Payment).filter(
        Payment.customer_id == customer_id
    ).order_by(Payment.date.desc()).all()

@router.post("/", response_model=PaymentOut)
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    payment_date = data.date or datetime.utcnow()
    payment = Payment(
        customer_id=data.customer_id,
        amount=data.amount,
        method=data.method,
        description=data.description,
        date=payment_date
    )
    db.add(payment)

    # Son ödeme tarihini otomatik güncelle
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if customer:
        customer.son_odeme_tarihi = payment_date

    db.commit()
    db.refresh(payment)
    return payment

@router.delete("/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    db.delete(payment)
    db.commit()
    return {"message": "Ödeme silindi"}