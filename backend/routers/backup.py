from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.models import Customer, Debt, Payment, BankTransaction, CustomerIBAN
import json
import os
from datetime import datetime

router = APIRouter(prefix="/backup", tags=["Yedekleme"])

@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    customers = db.query(Customer).all()
    debts = db.query(Debt).all()
    payments = db.query(Payment).all()
    transactions = db.query(BankTransaction).all()
    ibans = db.query(CustomerIBAN).all()

    data = {
        "backup_date": datetime.utcnow().isoformat(),
        "version": "1.0",
        "customers": [
            {"id": c.id, "name": c.name, "phone": c.phone, "address": c.address, "notes": c.notes, "created_at": str(c.created_at)}
            for c in customers
        ],
        "customer_ibans": [
            {"id": i.id, "customer_id": i.customer_id, "iban": i.iban, "label": i.label}
            for i in ibans
        ],
        "debts": [
            {"id": d.id, "customer_id": d.customer_id, "amount": d.amount, "description": d.description,
             "category": d.category, "date": str(d.date), "created_at": str(d.created_at)}
            for d in debts
        ],
        "payments": [
            {"id": p.id, "customer_id": p.customer_id, "amount": p.amount, "method": p.method.value if p.method else None,
             "description": p.description, "date": str(p.date), "created_at": str(p.created_at)}
            for p in payments
        ],
        "bank_transactions": [
            {"id": t.id, "transaction_hash": t.transaction_hash, "date": str(t.date),
             "sender_name": t.sender_name, "sender_iban": t.sender_iban, "amount": t.amount,
             "description": t.description, "is_matched": t.is_matched, "matched_customer_id": t.matched_customer_id}
            for t in transactions
        ]
    }

    filename = f"veresiye_yedek_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(os.path.dirname(__file__), '..', filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return FileResponse(filepath, filename=filename, media_type='application/json')

@router.get("/stats")
def backup_stats(db: Session = Depends(get_db)):
    return {
        "musteri_sayisi": db.query(Customer).count(),
        "borc_sayisi": db.query(Debt).count(),
        "odeme_sayisi": db.query(Payment).count(),
        "banka_islemi_sayisi": db.query(BankTransaction).count(),
    }