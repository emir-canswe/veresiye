from thefuzz import fuzz
from sqlalchemy.orm import Session
from models.models import Customer, CustomerIBAN, Debt, Payment, BankTransaction
from datetime import datetime, timedelta
import re

class MatchResult:
    def __init__(self, customer_id=None, confidence=0, method="", details=""):
        self.customer_id = customer_id
        self.confidence = confidence  # 0-100
        self.method = method
        self.details = details

    def to_dict(self):
        return {
            "customer_id": self.customer_id,
            "confidence": self.confidence,
            "method": self.method,
            "details": self.details
        }

def normalize_name(name: str) -> str:
    if not name:
        return ""
    name = name.upper()
    name = name.replace("İ", "I").replace("Ğ", "G").replace("Ü", "U")
    name = name.replace("Ş", "S").replace("Ö", "O").replace("Ç", "C")
    name = re.sub(r'[^A-Z0-9 ]', '', name)
    name = ' '.join(name.split())
    return name

def normalize_iban(iban: str) -> str:
    if not iban:
        return ""
    return re.sub(r'[\s-]', '', iban.upper())

def extract_phone_from_text(text: str) -> list:
    if not text:
        return []
    phones = re.findall(r'0?5\d{9}', re.sub(r'[\s-]', '', text))
    return phones

def smart_match(db: Session, transaction: BankTransaction) -> list[MatchResult]:
    results = []
    customers = db.query(Customer).all()
    ibans = db.query(CustomerIBAN).all()

    sender_iban = normalize_iban(transaction.sender_iban or "")
    sender_name = normalize_name(transaction.sender_name or "")
    description = transaction.description or ""
    amount = transaction.amount

    # 1. IBAN TAM EŞLEŞME → %100
    if sender_iban:
        for iban in ibans:
            if normalize_iban(iban.iban) == sender_iban:
                results.append(MatchResult(
                    customer_id=iban.customer_id,
                    confidence=100,
                    method="IBAN Tam Eşleşme",
                    details=f"IBAN: {iban.iban}"
                ))

    # 2. İSİM TAM EŞLEŞME → %95
    if sender_name:
        for c in customers:
            norm_customer = normalize_name(c.name)
            if norm_customer == sender_name:
                results.append(MatchResult(
                    customer_id=c.id,
                    confidence=95,
                    method="İsim Tam Eşleşme",
                    details=f"Müşteri: {c.name}"
                ))

    # 3. İSİM FUZZY EŞLEŞME → %60-90
    if sender_name:
        for c in customers:
            norm_customer = normalize_name(c.name)

            # Token sort ratio - kelime sırası önemli değil
            ratio1 = fuzz.token_sort_ratio(sender_name, norm_customer)
            # Partial ratio - kısmi eşleşme
            ratio2 = fuzz.partial_ratio(sender_name, norm_customer)
            # Token set ratio - fazla kelimeleri yoksay
            ratio3 = fuzz.token_set_ratio(sender_name, norm_customer)

            best_ratio = max(ratio1, ratio2, ratio3)

            if best_ratio >= 75:
                confidence = min(90, int(best_ratio * 0.92))
                results.append(MatchResult(
                    customer_id=c.id,
                    confidence=confidence,
                    method="İsim Benzerliği",
                    details=f"Benzerlik: %{best_ratio} ({c.name})"
                ))

    # 4. AÇIKLAMA'DAN TELEFON ARAMA → %85
    phones_in_desc = extract_phone_from_text(description)
    if phones_in_desc:
        for c in customers:
            if c.phone:
                customer_phone = re.sub(r'[\s-]', '', c.phone)
                for phone in phones_in_desc:
                    if phone in customer_phone or customer_phone in phone:
                        results.append(MatchResult(
                            customer_id=c.id,
                            confidence=85,
                            method="Telefon Eşleşmesi",
                            details=f"Telefon: {phone}"
                        ))

    # 5. AÇIKLAMA'DAN İSİM ARAMA → %70-80
    if description and sender_name:
        desc_normalized = normalize_name(description)
        for c in customers:
            norm_customer = normalize_name(c.name)
            if len(norm_customer) > 3 and norm_customer in desc_normalized:
                results.append(MatchResult(
                    customer_id=c.id,
                    confidence=78,
                    method="Açıklama İsim Eşleşmesi",
                    details=f"Açıklamada bulundu: {c.name}"
                ))
            else:
                ratio = fuzz.partial_ratio(norm_customer, desc_normalized)
                if ratio >= 80:
                    results.append(MatchResult(
                        customer_id=c.id,
                        confidence=70,
                        method="Açıklama Benzerliği",
                        details=f"Açıklamada benzerlik: %{ratio}"
                    ))

    # 6. TUTAR + MÜŞTERİ BORÇ EŞLEŞMESİ → %65
    for c in customers:
        customer_debts = db.query(Debt).filter(
            Debt.customer_id == c.id
        ).all()
        for debt in customer_debts:
            if abs(debt.amount - amount) < 0.01:
                results.append(MatchResult(
                    customer_id=c.id,
                    confidence=65,
                    method="Tutar Eşleşmesi",
                    details=f"Borç tutarıyla eşleşti: {debt.amount}₺"
                ))

    # 7. ÖĞRENME SİSTEMİ → Geçmiş eşleşmelerden öğren
    if sender_iban or sender_name:
        past_transactions = db.query(BankTransaction).filter(
            BankTransaction.is_matched == True,
            BankTransaction.matched_customer_id != None
        ).all()

        for past in past_transactions:
            past_iban = normalize_iban(past.sender_iban or "")
            past_name = normalize_name(past.sender_name or "")

            if sender_iban and past_iban and sender_iban == past_iban:
                results.append(MatchResult(
                    customer_id=past.matched_customer_id,
                    confidence=92,
                    method="Geçmiş IBAN Öğrenimi",
                    details=f"Bu IBAN daha önce eşleştirildi"
                ))
            elif sender_name and past_name:
                ratio = fuzz.token_sort_ratio(sender_name, past_name)
                if ratio >= 85:
                    results.append(MatchResult(
                        customer_id=past.matched_customer_id,
                        confidence=80,
                        method="Geçmiş İsim Öğrenimi",
                        details=f"Bu isim daha önce eşleştirildi (%{ratio})"
                    ))

    # Sonuçları birleştir — aynı müşteri için en yüksek skoru al
    merged = {}
    for r in results:
        cid = r.customer_id
        if cid not in merged or merged[cid].confidence < r.confidence:
            merged[cid] = r

    # Güven skoruna göre sırala
    sorted_results = sorted(merged.values(), key=lambda x: x.confidence, reverse=True)

    return sorted_results[:5]  # En iyi 5 sonucu döndür


def auto_match_transaction(db: Session, transaction: BankTransaction) -> MatchResult | None:
    results = smart_match(db, transaction)
    if not results:
        return None
    best = results[0]
    # %85 ve üzeri güven → otomatik eşleştir
    if best.confidence >= 85:
        return best
    return None