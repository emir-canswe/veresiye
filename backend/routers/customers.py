from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Customer, CustomerIBAN, Debt, Payment, BankTransaction
from schemas.schemas import CustomerCreate, CustomerOut
from datetime import datetime

router = APIRouter(prefix="/customers", tags=["Müşteriler"])

@router.get("/", response_model=list[CustomerOut])
def get_customers(db: Session = Depends(get_db)):
    return db.query(Customer).all()

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return customer

@router.post("/", response_model=CustomerOut)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    existing_name = db.query(Customer).filter(Customer.name.ilike(data.name.strip())).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"'{data.name}' adında bir müşteri zaten kayıtlı!")

    if data.phone:
        existing_phone = db.query(Customer).filter(Customer.phone == data.phone.strip()).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail=f"'{data.phone}' telefon numarası zaten kayıtlı!")

    if data.ibans:
        for iban_data in data.ibans:
            existing_iban = db.query(CustomerIBAN).filter(CustomerIBAN.iban == iban_data.iban.strip()).first()
            if existing_iban:
                raise HTTPException(status_code=400, detail=f"'{iban_data.iban}' IBAN numarası zaten kayıtlı!")

    customer = Customer(
        name=data.name.strip(),
        phone=data.phone.strip() if data.phone else None,
        address=data.address,
        notes=data.notes,
        son_odeme_tarihi=data.son_odeme_tarihi,
        created_at=datetime.utcnow()
    )
    db.add(customer)
    db.flush()
    for iban in data.ibans:
        db.add(CustomerIBAN(customer_id=customer.id, iban=iban.iban.strip(), label=iban.label))
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, data: CustomerCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    existing_name = db.query(Customer).filter(
        Customer.name.ilike(data.name.strip()), Customer.id != customer_id
    ).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"'{data.name}' adında başka bir müşteri zaten kayıtlı!")

    if data.phone:
        existing_phone = db.query(Customer).filter(
            Customer.phone == data.phone.strip(), Customer.id != customer_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail=f"'{data.phone}' telefon numarası başka bir müşteride kayıtlı!")

    customer.name = data.name.strip()
    customer.phone = data.phone.strip() if data.phone else None
    customer.address = data.address
    customer.notes = data.notes
    customer.son_odeme_tarihi = data.son_odeme_tarihi

    # IBAN güncelleme — mevcut IBAN'ları sil, yenilerini ekle
    if data.ibans is not None:
        db.query(CustomerIBAN).filter(CustomerIBAN.customer_id == customer_id).delete()
        for iban in data.ibans:
            if iban.iban and iban.iban.strip():
                db.add(CustomerIBAN(
                    customer_id=customer_id,
                    iban=iban.iban.strip(),
                    label=iban.label
                ))

    db.commit()
    db.refresh(customer)
    return customer

@router.patch("/{customer_id}/son-odeme")
def update_son_odeme(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    customer.son_odeme_tarihi = datetime.utcnow()
    db.commit()
    return {"message": "Son ödeme tarihi güncellendi"}

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    db.query(BankTransaction).filter(
        BankTransaction.matched_customer_id == customer_id
    ).update({"matched_customer_id": None, "is_matched": False})

    db.query(Payment).filter(Payment.customer_id == customer_id).delete()
    db.query(Debt).filter(Debt.customer_id == customer_id).delete()
    db.query(CustomerIBAN).filter(CustomerIBAN.customer_id == customer_id).delete()

    db.delete(customer)
    db.commit()
    return {"message": "Müşteri ve tüm kayıtları silindi"}