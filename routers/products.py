"""
Produits numériques — Gumroad, Lemon Squeezy, saisie manuelle.
"""
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import DigitalProduct, User
from routers.auth_users import get_current_user
import config

router = APIRouter()


class ProductCreate(BaseModel):
    platform: str          # gumroad | lemon_squeezy | manual
    api_key: str = ""
    product_name: str
    monthly_revenue: float = 0.0


class ProductUpdate(BaseModel):
    product_name: str = None
    monthly_revenue: float = None
    api_key: str = None


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/")
def list_products(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products = db.query(DigitalProduct).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": p.id, "platform": p.platform,
            "product_name": p.product_name,
            "monthly_revenue": p.monthly_revenue,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in products
    ]


@router.post("/")
def create_product(data: ProductCreate, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    product = DigitalProduct(
        platform=data.platform,
        api_key=data.api_key or None,
        product_name=data.product_name,
        monthly_revenue=data.monthly_revenue,
        user_id=current_user.id,
        last_updated=datetime.utcnow(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"id": product.id, "status": "created"}


@router.put("/{product_id}")
def update_product(product_id: int, data: ProductUpdate,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    product = db.query(DigitalProduct).filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if data.product_name is not None:
        product.product_name = data.product_name
    if data.monthly_revenue is not None:
        product.monthly_revenue = data.monthly_revenue
    if data.api_key is not None:
        product.api_key = data.api_key
    product.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "updated"}


@router.delete("/{product_id}")
def delete_product(product_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    product = db.query(DigitalProduct).filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    db.delete(product)
    db.commit()
    return {"status": "deleted"}


# ── Sync Gumroad ──────────────────────────────────────────────────────────────

@router.post("/{product_id}/sync/gumroad")
def sync_gumroad(product_id: int, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Synchronise les revenus depuis l'API Gumroad."""
    product = db.query(DigitalProduct).filter_by(id=product_id, user_id=current_user.id).first()
    if not product or product.platform != "gumroad":
        raise HTTPException(status_code=404, detail="Produit Gumroad introuvable")

    api_key = product.api_key or config.GUMROAD_API_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="Clé API Gumroad manquante")

    resp = httpx.get(
        "https://api.gumroad.com/v2/sales",
        params={"access_token": api_key},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Erreur API Gumroad")

    sales = resp.json().get("sales", [])
    # Somme du mois en cours
    this_month = datetime.utcnow().strftime("%Y-%m")
    monthly = sum(
        s.get("price", 0) / 100
        for s in sales
        if s.get("created_at", "").startswith(this_month)
    )

    product.monthly_revenue = round(monthly, 2)
    product.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "synced", "monthly_revenue": product.monthly_revenue}


# ── Sync Lemon Squeezy ────────────────────────────────────────────────────────

@router.post("/{product_id}/sync/lemonsqueezy")
def sync_lemonsqueezy(product_id: int, current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Synchronise les revenus depuis l'API Lemon Squeezy."""
    product = db.query(DigitalProduct).filter_by(id=product_id, user_id=current_user.id).first()
    if not product or product.platform != "lemon_squeezy":
        raise HTTPException(status_code=404, detail="Produit Lemon Squeezy introuvable")

    api_key = product.api_key or config.LEMON_SQUEEZY_API_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="Clé API Lemon Squeezy manquante")

    resp = httpx.get(
        "https://api.lemonsqueezy.com/v1/orders",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/vnd.api+json",
        },
        params={"filter[status]": "paid"},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Erreur API Lemon Squeezy")

    orders = resp.json().get("data", [])
    this_month = datetime.utcnow().strftime("%Y-%m")
    monthly = sum(
        o.get("attributes", {}).get("subtotal", 0) / 100
        for o in orders
        if o.get("attributes", {}).get("created_at", "").startswith(this_month)
    )

    product.monthly_revenue = round(monthly, 2)
    product.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "synced", "monthly_revenue": product.monthly_revenue}
