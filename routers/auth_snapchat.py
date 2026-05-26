"""OAuth Snapchat — Snap Kit."""
import secrets, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import SnapchatAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def snapchat_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.SNAPCHAT_CLIENT_ID:
        return RedirectResponse("https://kit.snapchat.com/manage")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"client_id": config.SNAPCHAT_CLIENT_ID, "redirect_uri": config.SNAPCHAT_REDIRECT_URI,
              "response_type": "code", "scope": " ".join(config.SNAPCHAT_SCOPES), "state": state}
    return RedirectResponse(f"{config.SNAPCHAT_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def snapchat_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.FRONTEND_URL}?error=snapchat_failed")
    user_id = _states.pop(state)

    resp = httpx.post(config.SNAPCHAT_TOKEN_URL, data={
        "client_id": config.SNAPCHAT_CLIENT_ID, "client_secret": config.SNAPCHAT_CLIENT_SECRET,
        "code": code, "grant_type": "authorization_code", "redirect_uri": config.SNAPCHAT_REDIRECT_URI,
    })
    if resp.status_code != 200:
        return RedirectResponse(f"{config.FRONTEND_URL}?error=snapchat_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    me_resp = httpx.get("https://kit.snapchat.com/v1/me",
                        headers={"Authorization": f"Bearer {access_token}"})
    me = me_resp.json().get("data", {}).get("me", {}) if me_resp.status_code == 200 else {}
    account_id = me.get("externalId", secrets.token_hex(8))
    display_name = me.get("displayName", "Snapchat User")

    acc = db.query(SnapchatAccount).filter_by(account_id=account_id, user_id=user_id).first()
    if not acc:
        acc = SnapchatAccount(account_id=account_id, user_id=user_id)
        db.add(acc)
    acc.display_name = display_name
    acc.access_token = access_token
    acc.refresh_token = refresh_token
    acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.FRONTEND_URL}?connected=snapchat")

@router.get("/accounts")
def list_snapchat(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "display_name": a.display_name, "followers": a.followers,
             "story_views": a.story_views, "reach": a.reach, "ad_revenue": a.ad_revenue,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(SnapchatAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/revenue")
def update_snap_revenue(aid: int, revenue: float, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    a = db.query(SnapchatAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.ad_revenue = revenue; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_snapchat(aid: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    a = db.query(SnapchatAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
