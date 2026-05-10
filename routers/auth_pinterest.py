"""OAuth Pinterest API v5."""
import secrets, base64, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import PinterestAccount, User
from routers.auth_users import get_current_user

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def pinterest_login(current_user: User = Depends(get_current_user)):
    if not config.PINTEREST_APP_ID:
        return RedirectResponse("https://developers.pinterest.com/apps/")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"client_id": config.PINTEREST_APP_ID, "redirect_uri": config.PINTEREST_REDIRECT_URI,
              "response_type": "code", "scope": ",".join(config.PINTEREST_SCOPES), "state": state}
    return RedirectResponse(f"{config.PINTEREST_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def pinterest_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=pinterest_failed")
    user_id = _states.pop(state)

    credentials = base64.b64encode(f"{config.PINTEREST_APP_ID}:{config.PINTEREST_APP_SECRET}".encode()).decode()
    resp = httpx.post(config.PINTEREST_TOKEN_URL,
                      headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "authorization_code", "code": code, "redirect_uri": config.PINTEREST_REDIRECT_URI})
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=pinterest_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    me_resp = httpx.get("https://api.pinterest.com/v5/user_account",
                        headers={"Authorization": f"Bearer {access_token}"})
    me = me_resp.json() if me_resp.status_code == 200 else {}
    account_id = me.get("username", secrets.token_hex(8))
    username = me.get("username", "")
    display_name = me.get("profile_name", "")
    followers = me.get("follower_count", 0)

    acc = db.query(PinterestAccount).filter_by(account_id=account_id, user_id=user_id).first()
    if not acc:
        acc = PinterestAccount(account_id=account_id, user_id=user_id)
        db.add(acc)
    acc.username = username; acc.display_name = display_name
    acc.access_token = access_token; acc.refresh_token = refresh_token
    acc.followers = followers; acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=pinterest")

@router.get("/accounts")
def list_pinterest(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "username": a.username, "display_name": a.display_name,
             "followers": a.followers, "impressions": a.impressions, "clicks": a.clicks,
             "ad_revenue": a.ad_revenue, "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(PinterestAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/revenue")
def update_pin_revenue(aid: int, revenue: float, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    a = db.query(PinterestAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.ad_revenue = revenue; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_pinterest(aid: int, current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    a = db.query(PinterestAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
