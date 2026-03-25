from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Product, StockCategory, StockMovement
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/stock", tags=["Stok"])

# --- Schemas ---
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    purchase_price: float = 0
    sale_price: float = 0
    stock_quantity: float = 0
    min_stock: float = 0
    unit: str = "adet"
    description: Optional[str] = None

class StockMovementCreate(BaseModel):
    product_id: int
    type: str  # giris, cikis, iade
    quantity: float
    unit_price: float = 0
    customer_id: Optional[int] = None
    description: Optional[str] = None

# --- Kategori ---
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(StockCategory).all()

@router.post("/categories")
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    cat = StockCategory(name=data.name, description=data.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(StockCategory).filter(StockCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    db.delete(cat)
    db.commit()
    return {"message": "Kategori silindi"}

# --- Ürünler ---
@router.get("/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    result = []
    for p in products:
        result.append({
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else None,
            "purchase_price": p.purchase_price,
            "sale_price": p.sale_price,
            "stock_quantity": p.stock_quantity,
            "min_stock": p.min_stock,
            "unit": p.unit,
            "description": p.description,
            "is_low_stock": p.stock_quantity <= p.min_stock,
            "created_at": p.created_at
        })
    return result

@router.get("/products/low-stock")
def get_low_stock(db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.stock_quantity <= Product.min_stock
    ).all()
    return products

@router.post("/products")
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.name == data.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"'{data.name}' adında bir ürün zaten var!")
    product = Product(
        name=data.name.strip(),
        barcode=data.barcode,
        category_id=data.category_id,
        purchase_price=data.purchase_price,
        sale_price=data.sale_price,
        stock_quantity=data.stock_quantity,
        min_stock=data.min_stock,
        unit=data.unit,
        description=data.description
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    product.name = data.name.strip()
    product.barcode = data.barcode
    product.category_id = data.category_id
    product.purchase_price = data.purchase_price
    product.sale_price = data.sale_price
    product.min_stock = data.min_stock
    product.unit = data.unit
    product.description = data.description
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    product.is_active = False
    db.commit()
    return {"message": "Ürün silindi"}

# --- Stok Hareketleri ---
@router.get("/movements")
def get_movements(db: Session = Depends(get_db)):
    movements = db.query(StockMovement).order_by(StockMovement.date.desc()).all()
    result = []
    for m in movements:
        result.append({
            "id": m.id,
            "product_id": m.product_id,
            "product_name": m.product.name if m.product else None,
            "type": m.type,
            "quantity": m.quantity,
            "unit_price": m.unit_price,
            "total": m.quantity * m.unit_price,
            "customer_id": m.customer_id,
            "description": m.description,
            "date": m.date
        })
    return result

@router.post("/movements")
def create_movement(data: StockMovementCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    if data.type == "cikis" and product.stock_quantity < data.quantity:
        raise HTTPException(status_code=400, detail=f"Yetersiz stok! Mevcut: {product.stock_quantity} {product.unit}")

    movement = StockMovement(
        product_id=data.product_id,
        type=data.type,
        quantity=data.quantity,
        unit_price=data.unit_price,
        customer_id=data.customer_id,
        description=data.description
    )

    if data.type == "giris":
        product.stock_quantity += data.quantity
    elif data.type == "cikis":
        product.stock_quantity -= data.quantity
    elif data.type == "iade":
        product.stock_quantity += data.quantity

    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

@router.get("/stats")
def get_stock_stats(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    total_value = sum(p.stock_quantity * p.purchase_price for p in products)
    low_stock = sum(1 for p in products if p.stock_quantity <= p.min_stock)
    return {
        "toplam_urun": len(products),
        "dusuk_stok": low_stock,
        "toplam_stok_degeri": total_value
    }