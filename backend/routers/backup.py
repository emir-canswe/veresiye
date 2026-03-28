import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, get_db
from models.models import (
    BankTransaction,
    CompanySettings,
    Customer,
    CustomerIBAN,
    Debt,
    Payment,
    PaymentMethod,
    Product,
    StockCategory,
    StockMovement,
    Transaction as FinanceTransaction,
    TransactionType,
    User,
)
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/backup", tags=["Yedekleme"])

BACKUP_VERSION = "2.0"

PG_TABLES_FOR_SEQUENCES = [
    "customers",
    "customer_ibans",
    "debts",
    "payments",
    "bank_transactions",
    "stock_categories",
    "products",
    "stock_movements",
    "transactions",
]


def _parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        pass
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        pass
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d")
    except ValueError:
        return datetime.utcnow()


def _reset_pg_sequences(db: Session) -> None:
    if engine.dialect.name != "postgresql":
        return
    for t in PG_TABLES_FOR_SEQUENCES:
        db.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {t}), 1))"
            )
        )
    db.commit()


def _build_export_payload(db: Session) -> dict:
    customers = db.query(Customer).all()
    debts = db.query(Debt).all()
    payments = db.query(Payment).all()
    transactions = db.query(BankTransaction).all()
    ibans = db.query(CustomerIBAN).all()
    categories = db.query(StockCategory).all()
    products = db.query(Product).all()
    movements = db.query(StockMovement).all()
    finance_rows = db.query(FinanceTransaction).all()
    company = db.query(CompanySettings).filter(CompanySettings.id == 1).first()

    return {
        "backup_date": datetime.utcnow().isoformat(),
        "version": BACKUP_VERSION,
        "company": {
            "company_name": company.company_name if company else "İşletmem",
            "tax_id": company.tax_id if company else None,
            "phone": company.phone if company else None,
            "address": company.address if company else None,
            "city": company.city if company else None,
        }
        if company
        else None,
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "address": c.address,
                "notes": c.notes,
                "son_odeme_tarihi": c.son_odeme_tarihi.isoformat() if c.son_odeme_tarihi else None,
                "created_at": str(c.created_at),
            }
            for c in customers
        ],
        "customer_ibans": [
            {"id": i.id, "customer_id": i.customer_id, "iban": i.iban, "label": i.label}
            for i in ibans
        ],
        "debts": [
            {
                "id": d.id,
                "customer_id": d.customer_id,
                "amount": d.amount,
                "description": d.description,
                "category": d.category,
                "date": str(d.date),
                "created_at": str(d.created_at),
            }
            for d in debts
        ],
        "payments": [
            {
                "id": p.id,
                "customer_id": p.customer_id,
                "amount": p.amount,
                "method": p.method.value if hasattr(p.method, "value") else str(p.method),
                "description": p.description,
                "date": str(p.date),
                "created_at": str(p.created_at),
                "bank_transaction_id": p.bank_transaction_id,
            }
            for p in payments
        ],
        "bank_transactions": [
            {
                "id": t.id,
                "transaction_hash": t.transaction_hash,
                "date": str(t.date),
                "sender_name": t.sender_name,
                "sender_iban": t.sender_iban,
                "amount": t.amount,
                "description": t.description,
                "is_matched": t.is_matched,
                "matched_customer_id": t.matched_customer_id,
                "created_at": str(t.created_at),
            }
            for t in transactions
        ],
        "stock_categories": [
            {"id": c.id, "name": c.name, "description": c.description, "created_at": str(c.created_at)}
            for c in categories
        ],
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "category_id": p.category_id,
                "purchase_price": p.purchase_price,
                "sale_price": p.sale_price,
                "stock_quantity": p.stock_quantity,
                "min_stock": p.min_stock,
                "unit": p.unit,
                "description": p.description,
                "is_active": p.is_active,
                "created_at": str(p.created_at),
            }
            for p in products
        ],
        "stock_movements": [
            {
                "id": m.id,
                "product_id": m.product_id,
                "type": m.type,
                "quantity": m.quantity,
                "unit_price": m.unit_price,
                "customer_id": m.customer_id,
                "description": m.description,
                "date": str(m.date),
                "created_at": str(m.created_at),
            }
            for m in movements
        ],
        "finance_transactions": [
            {
                "id": ft.id,
                "type": ft.type.value if hasattr(ft.type, "value") else str(ft.type),
                "amount": ft.amount,
                "category": ft.category,
                "description": ft.description,
                "date": str(ft.date),
                "payment_method": ft.payment_method.value
                if hasattr(ft.payment_method, "value")
                else str(ft.payment_method),
                "customer_id": ft.customer_id,
                "created_at": str(ft.created_at),
            }
            for ft in finance_rows
        ],
    }


@router.get("/export")
def export_backup(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = _build_export_payload(db)
    raw = json.dumps(data, ensure_ascii=False, indent=2)
    filename = f"veresiye_yedek_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(
        io.BytesIO(raw.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/stats")
def backup_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "musteri_sayisi": db.query(Customer).count(),
        "borc_sayisi": db.query(Debt).count(),
        "odeme_sayisi": db.query(Payment).count(),
        "banka_islemi_sayisi": db.query(BankTransaction).count(),
        "stok_urun": db.query(Product).count(),
        "gelir_gider": db.query(FinanceTransaction).count(),
    }


@router.post("/import")
async def import_backup(
    file: UploadFile = File(...),
    confirm: str = Form(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if confirm.strip() != "YEDEKTEN_YUKLE":
        raise HTTPException(
            status_code=400,
            detail='Onay metni yanlış. Güvenlik için confirm alanı tam olarak "YEDEKTEN_YUKLE" olmalıdır.',
        )
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Sadece .json yedek dosyası yükleyin.")

    body = await file.read()
    try:
        data = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Geçersiz JSON: {e}") from e

    if not isinstance(data, dict) or "customers" not in data:
        raise HTTPException(status_code=400, detail="Yedek dosyası tanınmadı (customers eksik).")

    try:
        db.query(Payment).delete()
        db.query(Debt).delete()
        db.query(CustomerIBAN).delete()
        db.query(BankTransaction).delete()
        db.query(StockMovement).delete()
        db.query(Product).delete()
        db.query(StockCategory).delete()
        db.query(FinanceTransaction).delete()
        db.query(Customer).delete()

        comp = data.get("company")
        if comp and isinstance(comp, dict):
            row = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
            if not row:
                row = CompanySettings(id=1)
                db.add(row)
            row.company_name = (comp.get("company_name") or "İşletmem").strip()[:500]
            row.tax_id = (comp.get("tax_id") or None) and str(comp.get("tax_id"))[:64]
            row.phone = (comp.get("phone") or None) and str(comp.get("phone"))[:64]
            row.address = comp.get("address")
            row.city = (comp.get("city") or None) and str(comp.get("city"))[:128]
            row.updated_at = datetime.utcnow()

        for c in data.get("customers") or []:
            db.add(
                Customer(
                    id=c["id"],
                    name=c["name"],
                    phone=c.get("phone"),
                    address=c.get("address"),
                    notes=c.get("notes"),
                    son_odeme_tarihi=_parse_dt(c.get("son_odeme_tarihi")),
                    created_at=_parse_dt(c.get("created_at")) or datetime.utcnow(),
                )
            )

        for i in data.get("customer_ibans") or []:
            db.add(
                CustomerIBAN(
                    id=i["id"],
                    customer_id=i["customer_id"],
                    iban=i["iban"],
                    label=i.get("label"),
                )
            )

        for t in data.get("bank_transactions") or []:
            db.add(
                BankTransaction(
                    id=t["id"],
                    transaction_hash=t["transaction_hash"],
                    date=_parse_dt(t.get("date")) or datetime.utcnow(),
                    sender_name=t.get("sender_name"),
                    sender_iban=t.get("sender_iban"),
                    amount=float(t["amount"]),
                    description=t.get("description"),
                    is_matched=bool(t.get("is_matched")),
                    matched_customer_id=t.get("matched_customer_id"),
                    created_at=_parse_dt(t.get("created_at")) or datetime.utcnow(),
                )
            )

        for d in data.get("debts") or []:
            db.add(
                Debt(
                    id=d["id"],
                    customer_id=d["customer_id"],
                    amount=float(d["amount"]),
                    description=d.get("description"),
                    category=d.get("category"),
                    date=_parse_dt(d.get("date")) or datetime.utcnow(),
                    created_at=_parse_dt(d.get("created_at")) or datetime.utcnow(),
                )
            )

        for p in data.get("payments") or []:
            method_raw = p.get("method", "nakit")
            try:
                pm = PaymentMethod(method_raw) if isinstance(method_raw, str) else method_raw
            except ValueError:
                pm = PaymentMethod.nakit
            db.add(
                Payment(
                    id=p["id"],
                    customer_id=p["customer_id"],
                    amount=float(p["amount"]),
                    method=pm,
                    description=p.get("description"),
                    date=_parse_dt(p.get("date")) or datetime.utcnow(),
                    bank_transaction_id=p.get("bank_transaction_id"),
                    created_at=_parse_dt(p.get("created_at")) or datetime.utcnow(),
                )
            )

        for sc in data.get("stock_categories") or []:
            db.add(
                StockCategory(
                    id=sc["id"],
                    name=sc["name"],
                    description=sc.get("description"),
                    created_at=_parse_dt(sc.get("created_at")) or datetime.utcnow(),
                )
            )

        for pr in data.get("products") or []:
            db.add(
                Product(
                    id=pr["id"],
                    name=pr["name"],
                    barcode=pr.get("barcode"),
                    category_id=pr.get("category_id"),
                    purchase_price=float(pr.get("purchase_price") or 0),
                    sale_price=float(pr.get("sale_price") or 0),
                    stock_quantity=float(pr.get("stock_quantity") or 0),
                    min_stock=float(pr.get("min_stock") or 0),
                    unit=pr.get("unit") or "adet",
                    description=pr.get("description"),
                    is_active=pr.get("is_active", True),
                    created_at=_parse_dt(pr.get("created_at")) or datetime.utcnow(),
                )
            )

        for m in data.get("stock_movements") or []:
            db.add(
                StockMovement(
                    id=m["id"],
                    product_id=m["product_id"],
                    type=m["type"],
                    quantity=float(m["quantity"]),
                    unit_price=float(m.get("unit_price") or 0),
                    customer_id=m.get("customer_id"),
                    description=m.get("description"),
                    date=_parse_dt(m.get("date")) or datetime.utcnow(),
                    created_at=_parse_dt(m.get("created_at")) or datetime.utcnow(),
                )
            )

        for ft in data.get("finance_transactions") or []:
            traw = ft.get("type", "gelir")
            try:
                tt = TransactionType(traw) if isinstance(traw, str) else traw
            except ValueError:
                tt = TransactionType.gelir
            pmraw = ft.get("payment_method", "nakit")
            try:
                fpm = PaymentMethod(pmraw) if isinstance(pmraw, str) else pmraw
            except ValueError:
                fpm = PaymentMethod.nakit
            db.add(
                FinanceTransaction(
                    id=ft["id"],
                    type=tt,
                    amount=float(ft["amount"]),
                    category=ft.get("category"),
                    description=ft.get("description"),
                    date=_parse_dt(ft.get("date")) or datetime.utcnow(),
                    payment_method=fpm,
                    customer_id=ft.get("customer_id"),
                    created_at=_parse_dt(ft.get("created_at")) or datetime.utcnow(),
                )
            )

        db.commit()
        _reset_pg_sequences(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Geri yükleme başarısız: {e!s}") from e

    return {"message": "Yedek başarıyla yüklendi.", "version": data.get("version")}
