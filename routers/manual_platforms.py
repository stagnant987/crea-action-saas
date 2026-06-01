"""
Plateformes à saisie manuelle : Substack, Discord.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import SubstackNewsletter, DiscordServer, User
from routers.auth_users import get_current_user

router = APIRouter()

# ── Substack ──────────────────────────────────────────────────────────────────

class SubstackData(BaseModel):
    name: str = "Ma Newsletter"
    url: str = ""
    free_subscribers: int = 0
    paid_subscribers: int = 0
    monthly_revenue: float = 0.0

@router.get("/substack")
def list_substack(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": n.id, "name": n.name, "url": n.url,
             "free_subscribers": n.free_subscribers, "paid_subscribers": n.paid_subscribers,
             "monthly_revenue": n.monthly_revenue,
             "last_updated": n.last_updated.isoformat() if n.last_updated else None}
            for n in db.query(SubstackNewsletter).filter_by(user_id=current_user.id).all()]

@router.post("/substack")
def create_substack(data: SubstackData, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    n = SubstackNewsletter(**data.dict(), user_id=current_user.id, last_updated=datetime.utcnow())
    db.add(n); db.commit(); db.refresh(n)
    return {"id": n.id, "status": "created"}

@router.put("/substack/{nid}")
def update_substack(nid: int, data: SubstackData, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    n = db.query(SubstackNewsletter).filter_by(id=nid, user_id=current_user.id).first()
    if not n: raise HTTPException(status_code=404, detail="Newsletter introuvable")
    for k, v in data.dict().items(): setattr(n, k, v)
    n.last_updated = datetime.utcnow(); db.commit()
    return {"status": "updated"}

@router.delete("/substack/{nid}")
def delete_substack(nid: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    n = db.query(SubstackNewsletter).filter_by(id=nid, user_id=current_user.id).first()
    if not n: raise HTTPException(status_code=404, detail="Newsletter introuvable")
    db.delete(n); db.commit(); return {"status": "deleted"}

# ── Discord ───────────────────────────────────────────────────────────────────

class DiscordData(BaseModel):
    name: str = "Mon Serveur"
    invite_url: str = ""
    member_count: int = 0
    premium_members: int = 0
    monthly_revenue: float = 0.0

@router.get("/discord")
def list_discord(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": s.id, "name": s.name, "invite_url": s.invite_url,
             "member_count": s.member_count, "premium_members": s.premium_members,
             "monthly_revenue": s.monthly_revenue,
             "last_updated": s.last_updated.isoformat() if s.last_updated else None}
            for s in db.query(DiscordServer).filter_by(user_id=current_user.id).all()]

@router.post("/discord")
def create_discord(data: DiscordData, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    s = DiscordServer(**data.dict(), user_id=current_user.id, last_updated=datetime.utcnow())
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "status": "created"}

@router.put("/discord/{sid}")
def update_discord(sid: int, data: DiscordData, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    s = db.query(DiscordServer).filter_by(id=sid, user_id=current_user.id).first()
    if not s: raise HTTPException(status_code=404, detail="Serveur introuvable")
    for k, v in data.dict().items(): setattr(s, k, v)
    s.last_updated = datetime.utcnow(); db.commit()
    return {"status": "updated"}

@router.delete("/discord/{sid}")
def delete_discord(sid: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    s = db.query(DiscordServer).filter_by(id=sid, user_id=current_user.id).first()
    if not s: raise HTTPException(status_code=404, detail="Serveur introuvable")
    db.delete(s); db.commit(); return {"status": "deleted"}
