"""
Gestion des plateformes personnalisées (custom).
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import CustomPlatform, User
from routers.auth_users import get_current_user

router = APIRouter()


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class CustomPlatformCreate(BaseModel):
    name: str
    platform_type: str = "other"
    url: str = ""
    monthly_revenue: float = 0.0


class CustomPlatformUpdate(BaseModel):
    name: str
    platform_type: str = "other"
    url: str = ""
    monthly_revenue: float = 0.0


# ── API ───────────────────────────────────────────────────────────────────────

@router.get("/custom-platforms")
def list_custom_platforms(current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Liste toutes les plateformes personnalisées de l'utilisateur."""
    platforms = db.query(CustomPlatform).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "platform_type": p.platform_type,
            "url": p.url,
            "monthly_revenue": p.monthly_revenue,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in platforms
    ]


@router.post("/custom-platforms")
def create_custom_platform(data: CustomPlatformCreate,
                           current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Crée une nouvelle plateforme personnalisée."""
    platform = CustomPlatform(
        name=data.name,
        platform_type=data.platform_type,
        url=data.url,
        monthly_revenue=data.monthly_revenue,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        last_updated=datetime.utcnow(),
    )
    db.add(platform)
    db.commit()
    db.refresh(platform)
    return {"id": platform.id, "name": platform.name, "status": "created"}


@router.put("/custom-platforms/{platform_id}")
def update_custom_platform(platform_id: int, data: CustomPlatformUpdate,
                           current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Met à jour une plateforme personnalisée."""
    platform = db.query(CustomPlatform).filter_by(id=platform_id, user_id=current_user.id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")

    platform.name = data.name
    platform.platform_type = data.platform_type
    platform.url = data.url
    platform.monthly_revenue = data.monthly_revenue
    platform.last_updated = datetime.utcnow()

    db.commit()
    db.refresh(platform)
    return {"id": platform.id, "status": "updated"}


@router.delete("/custom-platforms/{platform_id}")
def delete_custom_platform(platform_id: int,
                           current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Supprime une plateforme personnalisée."""
    platform = db.query(CustomPlatform).filter_by(id=platform_id, user_id=current_user.id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")

    db.delete(platform)
    db.commit()
    return {"status": "deleted"}
