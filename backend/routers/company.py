from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from datetime import datetime
from datetime_util import utc_now
from models.models import CompanySettings, User
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/company", tags=["Şirket"])


class CompanyOut(BaseModel):
    id: int
    company_name: str
    tax_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyUpdate(BaseModel):
    company_name: str
    tax_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None


def _get_or_create_row(db: Session) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not row:
        row = CompanySettings(id=1, company_name="İşletmem")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/settings", response_model=CompanyOut)
def get_company_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return _get_or_create_row(db)


@router.put("/settings", response_model=CompanyOut)
def update_company_settings(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not data.company_name or not data.company_name.strip():
        raise HTTPException(status_code=400, detail="Şirket adı zorunludur.")
    row = _get_or_create_row(db)
    row.company_name = data.company_name.strip()
    row.tax_id = data.tax_id.strip() if data.tax_id else None
    row.phone = data.phone.strip() if data.phone else None
    row.address = data.address.strip() if data.address else None
    row.city = data.city.strip() if data.city else None
    row.updated_at = utc_now()
    db.commit()
    db.refresh(row)
    return row
