from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class PaymentMethod(str, enum.Enum):
    banka = "banka"
    nakit = "nakit"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="calisan")
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    address = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    ibans = relationship("CustomerIBAN", back_populates="customer")
    debts = relationship("Debt", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")

class CustomerIBAN(Base):
    __tablename__ = "customer_ibans"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    iban = Column(String, nullable=False)
    label = Column(String)
    customer = relationship("Customer", back_populates="ibans")

class Debt(Base):
    __tablename__ = "debts"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text)
    category = Column(String)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="debts")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    description = Column(Text)
    date = Column(DateTime, default=datetime.utcnow)
    bank_transaction_id = Column(Integer, ForeignKey("bank_transactions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="payments")
    bank_transaction = relationship("BankTransaction", back_populates="payment")

class BankTransaction(Base):
    __tablename__ = "bank_transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_hash = Column(String, unique=True, nullable=False)
    date = Column(DateTime, nullable=False)
    sender_name = Column(String)
    sender_iban = Column(String)
    amount = Column(Float, nullable=False)
    description = Column(Text)
    matched_customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    is_matched = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    payment = relationship("Payment", back_populates="bank_transaction", uselist=False)