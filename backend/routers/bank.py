from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models.models import BankTransaction, CustomerIBAN, Customer, Payment
from models.models import PaymentMethod
from schemas.schemas import BankTransactionOut, BankTransactionMatch
from services.matcher import smart_match, auto_match_transaction
import hashlib
import pandas as pd
import pdfplumber
import io
from datetime import datetime

router = APIRouter(prefix="/bank", tags=["Banka Ekstresi"])

def parse_pdf(content: bytes) -> list[dict]:
    transactions = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            for row in table[1:]:
                if not row or len(row) < 4:
                    continue
                try:
                    transactions.append({
                        "date": row[0],
                        "sender_name": row[1],
                        "sender_iban": row[2],
                        "amount": float(str(row[3]).replace(",", ".").replace(" ", "")),
                        "description": row[4] if len(row) > 4 else ""
                    })
                except (ValueError, TypeError, IndexError):
                    continue
    return transactions

def parse_excel(content: bytes) -> list[dict]:
    df = pd.read_excel(io.BytesIO(content))
    df.columns = [str(c).lower().strip() for c in df.columns]
    transactions = []
    for _, row in df.iterrows():
        try:
            transactions.append({
                "date": str(row.get("tarih", row.get("date", ""))),
                "sender_name": str(row.get("gonderen", row.get("sender", ""))),
                "sender_iban": str(row.get("iban", "")),
                "amount": float(str(row.get("tutar", row.get("amount", 0))).replace(",", ".")),
                "description": str(row.get("aciklama", row.get("description", "")))
            })
        except (ValueError, TypeError, KeyError):
            continue
    return transactions

def parse_csv(content: bytes) -> list[dict]:
    buf = io.BytesIO(content)
    try:
        df = pd.read_csv(buf, encoding="utf-8-sig", sep=None, engine="python")
    except Exception:
        buf.seek(0)
        try:
            df = pd.read_csv(buf, encoding="cp1254", sep=None, engine="python")
        except Exception:
            buf.seek(0)
            df = pd.read_csv(buf, encoding="utf-8", sep=";", engine="python")
    df.columns = [str(c).lower().strip() for c in df.columns]
    transactions = []
    for _, row in df.iterrows():
        try:
            transactions.append({
                "date": str(row.get("tarih", row.get("date", ""))),
                "sender_name": str(row.get("gonderen", row.get("sender", ""))),
                "sender_iban": str(row.get("iban", "")),
                "amount": float(str(row.get("tutar", row.get("amount", 0))).replace(",", ".")),
                "description": str(row.get("aciklama", row.get("description", "")))
            })
        except (ValueError, TypeError, KeyError):
            continue
    return transactions

def make_hash(date: str, amount: float, iban: str) -> str:
    raw = f"{date}_{amount}_{iban}"
    return hashlib.md5(raw.encode()).hexdigest()

@router.post("/upload", response_model=list[BankTransactionOut])
async def upload_statement(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        rows = parse_pdf(content)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        rows = parse_excel(content)
    elif filename.endswith(".csv"):
        rows = parse_csv(content)
    else:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya formatı.")

    saved = []
    for row in rows:
        tx_hash = make_hash(str(row["date"]), row["amount"], str(row.get("sender_iban", "")))
        existing = db.query(BankTransaction).filter(BankTransaction.transaction_hash == tx_hash).first()
        if existing:
            continue
        try:
            date = datetime.strptime(str(row["date"]), "%d.%m.%Y")
        except (ValueError, TypeError):
            date = datetime.utcnow()

        tx = BankTransaction(
            transaction_hash=tx_hash,
            date=date,
            sender_name=row.get("sender_name"),
            sender_iban=row.get("sender_iban"),
            amount=row["amount"],
            description=row.get("description")
        )

        # Gelişmiş otomatik eşleştirme
        best_match = auto_match_transaction(db, tx)
        if best_match:
            tx.matched_customer_id = best_match.customer_id
            tx.is_matched = True

        db.add(tx)
        saved.append(tx)

    db.commit()
    for tx in saved:
        db.refresh(tx)
    return saved

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    from models.models import Payment
    transactions = db.query(BankTransaction).order_by(BankTransaction.date.desc()).all()
    result = []
    for tx in transactions:
        payment = db.query(Payment).filter(Payment.bank_transaction_id == tx.id).first()
        result.append({
            "id": tx.id,
            "transaction_hash": tx.transaction_hash,
            "date": tx.date,
            "sender_name": tx.sender_name,
            "sender_iban": tx.sender_iban,
            "amount": tx.amount,
            "description": tx.description,
            "is_matched": tx.is_matched,
            "matched_customer_id": tx.matched_customer_id,
            "payment_id": payment.id if payment else None
        })
    return result
@router.get("/unmatched", response_model=list[BankTransactionOut])
def get_unmatched(db: Session = Depends(get_db)):
    return db.query(BankTransaction).filter(BankTransaction.is_matched == False).all()

@router.post("/transactions/{tx_id}/match")
def match_transaction(tx_id: int, data: BankTransactionMatch, db: Session = Depends(get_db)):
    tx = db.query(BankTransaction).filter(BankTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    tx.matched_customer_id = data.customer_id
    tx.is_matched = True
    db.commit()
    return {"message": "Eşleştirildi"}

@router.get("/transactions/{tx_id}/suggestions")
def get_suggestions(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(BankTransaction).filter(BankTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    results = smart_match(db, tx)
    customers = db.query(Customer).all()
    customer_map = {c.id: c.name for c in customers}
    return [
        {
            **r.to_dict(),
            "customer_name": customer_map.get(r.customer_id, "Bilinmiyor")
        }
        for r in results
    ]

@router.post("/transactions/{tx_id}/convert")
def convert_to_payment(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(BankTransaction).filter(BankTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    if not tx.is_matched or not tx.matched_customer_id:
        raise HTTPException(status_code=400, detail="Önce müşteriyle eşleştirin")

    existing = db.query(Payment).filter(Payment.bank_transaction_id == tx_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu işlem zaten ödemeye dönüştürüldü")

    payment = Payment(
        customer_id=tx.matched_customer_id,
        amount=tx.amount,
        method=PaymentMethod.banka,
        description=tx.description or f"Banka transferi — {tx.sender_name or ''}",
        date=tx.date,
        bank_transaction_id=tx.id
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return {"message": "Ödeme kaydı oluşturuldu", "payment_id": payment.id}