from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class PaymentMethod(str, Enum):
    banka = "banka"
    nakit = "nakit"

# --- Customer ---
class CustomerIBANBase(BaseModel):
    iban: str
    label: Optional[str] = None

class CustomerIBANOut(CustomerIBANBase):
    id: int
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    ibans: Optional[list[CustomerIBANBase]] = []

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    ibans: list[CustomerIBANOut] = []
    class Config:
        from_attributes = True

# --- Debt ---
class DebtBase(BaseModel):
    customer_id: int
    amount: float
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[datetime] = None

class DebtCreate(DebtBase):
    pass

class DebtOut(DebtBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Payment ---
class PaymentBase(BaseModel):
    customer_id: int
    amount: float
    method: PaymentMethod
    description: Optional[str] = None
    date: Optional[datetime] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentOut(PaymentBase):
    id: int
    created_at: datetime
    bank_transaction_id: Optional[int] = None
    class Config:
        from_attributes = True

# --- BankTransaction ---
class BankTransactionOut(BaseModel):
    id: int
    date: datetime
    sender_name: Optional[str] = None
    sender_iban: Optional[str] = None
    amount: float
    description: Optional[str] = None
    is_matched: bool
    matched_customer_id: Optional[int] = None
    class Config:
        from_attributes = True

class BankTransactionMatch(BaseModel):
    customer_id: int

# --- Dashboard ---
class DashboardOut(BaseModel):
    toplam_alacak: float
    toplam_tahsilat: float
    bugun_tahsilat: float
    bekleyen_borc: float