import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models.models import User
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-set-secret-key-in-env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["Auth"])

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "calisan"

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class UpdateUsername(BaseModel):
    new_username: str

class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def hash_password(password):
    return pwd_context.hash(password)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Geçersiz token")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli!")
    return current_user

def require_admin_or_muhasebeci(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "muhasebeci"]:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok!")
    return current_user

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Kullanıcı adı veya şifre hatalı")
    token = create_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "role": user.role}

@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/update-username")
def update_username(data: UpdateUsername, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.new_username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış!")
    current_user.username = data.new_username
    db.commit()
    return {"message": "Kullanıcı adı güncellendi"}

@router.put("/update-password")
def update_password(data: UpdatePassword, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı!")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 6 karakter olmalı!")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Şifre güncellendi"}

@router.get("/users", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).all()

@router.post("/users", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış!")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz!")
    db.delete(user)
    db.commit()
    return {"message": "Kullanıcı silindi"}