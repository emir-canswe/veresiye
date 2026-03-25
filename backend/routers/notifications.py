from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.models import Customer, Debt, Payment
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from datetime import datetime
import os

router = APIRouter(prefix="/notifications", tags=["Bildirimler"])

def get_mail_config():
    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_FROM=os.getenv("MAIL_FROM", ""),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True
    )

def get_customer_balance(db: Session, customer_id: int) -> float:
    total_debt = db.query(func.sum(Debt.amount)).filter(Debt.customer_id == customer_id).scalar() or 0
    total_payment = db.query(func.sum(Payment.amount)).filter(Payment.customer_id == customer_id).scalar() or 0
    return total_debt - total_payment

def get_overdue_customers(db: Session) -> list:
    customers = db.query(Customer).all()
    overdue = []
    for c in customers:
        balance = get_customer_balance(db, c.id)
        if balance <= 0:
            continue
        if not c.son_odeme_tarihi:
            overdue.append({"customer": c, "balance": balance, "days": None})
            continue
        days = (datetime.utcnow() - c.son_odeme_tarihi).days
        if days > 30:
            overdue.append({"customer": c, "balance": balance, "days": days})
    return overdue

async def send_overdue_email(to_email: str, customer_name: str, balance: float, days: int | None):
    conf = get_mail_config()
    if not conf.MAIL_USERNAME:
        return

    days_text = f"{days} gün önce" if days else "Hiç ödeme yapılmadı"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a56db, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">TahsilatPro</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Geciken Ödeme Bildirimi</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e8f0fe; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Sayın <strong>{customer_name}</strong>,</p>
            <p style="color: #6b7280; line-height: 1.7;">
                Hesabınızda gecikmiş borcunuz bulunmaktadır. Lütfen en kısa sürede ödeme yapmanızı rica ederiz.
            </p>
            <div style="background: #fde8e8; border: 1px solid #fca5a5; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; color: #9b1c1c;">Toplam Borç</div>
                <div style="font-size: 32px; font-weight: 800; color: #e02424;">
                    {balance:,.2f} ₺
                </div>
                <div style="font-size: 13px; color: #9b1c1c; margin-top: 8px;">
                    Son ödeme: {days_text}
                </div>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">
                Ödemenizi gerçekleştirdiyseniz lütfen bu bildirimi dikkate almayınız.
                Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz.
            </p>
            <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    Bu e-posta TahsilatPro sistemi tarafından otomatik olarak gönderilmiştir.
                </p>
            </div>
        </div>
    </div>
    """

    message = MessageSchema(
        subject="⚠️ Geciken Ödeme Bildirimi — TahsilatPro",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)

@router.get("/overdue")
def get_overdue(db: Session = Depends(get_db)):
    overdue = get_overdue_customers(db)
    return [
        {
            "customer_id": o["customer"].id,
            "customer_name": o["customer"].name,
            "phone": o["customer"].phone,
            "balance": o["balance"],
            "days": o["days"]
        }
        for o in overdue
    ]

@router.post("/send-overdue")
async def send_overdue_notifications(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    overdue = get_overdue_customers(db)
    sent = 0
    skipped = 0

    for o in overdue:
        customer = o["customer"]
        # Müşterinin e-postası notes alanında saklanıyor
        # Format: "email:ornek@mail.com" şeklinde
        email = None
        if customer.notes:
            for line in customer.notes.split('\n'):
                if line.startswith('email:'):
                    email = line.replace('email:', '').strip()

        if email:
            background_tasks.add_task(
                send_overdue_email,
                email,
                customer.name,
                o["balance"],
                o["days"]
            )
            sent += 1
        else:
            skipped += 1

    return {
        "message": f"{sent} bildirim gönderildi, {skipped} müşteride e-posta bulunamadı",
        "sent": sent,
        "skipped": skipped
    }

@router.post("/send-single/{customer_id}")
async def send_single_notification(
    customer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    balance = get_customer_balance(db, customer_id)
    if balance <= 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Bu müşterinin borcu yok")

    email = None
    if customer.notes:
        for line in customer.notes.split('\n'):
            if line.startswith('email:'):
                email = line.replace('email:', '').strip()

    if not email:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Müşteri e-posta adresi bulunamadı. Notlar kısmına 'email:ornek@mail.com' formatında ekleyin.")

    days = None
    if customer.son_odeme_tarihi:
        days = (datetime.utcnow() - customer.son_odeme_tarihi).days

    background_tasks.add_task(send_overdue_email, email, customer.name, balance, days)

    return {"message": f"{customer.name} adlı müşteriye bildirim gönderildi"}