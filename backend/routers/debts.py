from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Debt
from schemas.schemas import DebtCreate, DebtOut
from datetime_util import utc_now

router = APIRouter(prefix="/debts", tags=["Borçlar"])

@router.get("/", response_model=list[DebtOut])
def get_debts(db: Session = Depends(get_db)):
    return db.query(Debt).order_by(Debt.date.desc()).all()

@router.get("/customer/{customer_id}", response_model=list[DebtOut])
def get_customer_debts(customer_id: int, db: Session = Depends(get_db)):
    return db.query(Debt).filter(Debt.customer_id == customer_id).order_by(Debt.date.desc()).all()

@router.post("/", response_model=DebtOut)
def create_debt(data: DebtCreate, db: Session = Depends(get_db)):
    debt = Debt(
        customer_id=data.customer_id,
        amount=data.amount,
        description=data.description,
        category=data.category,
        date=data.date or utc_now()
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt

@router.delete("/{debt_id}")
def delete_debt(debt_id: int, db: Session = Depends(get_db)):
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Borç bulunamadı")
    db.delete(debt)
    db.commit()
    return {"message": "Borç silindi"}