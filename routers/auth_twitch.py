"""OAuth Twitch — Helix API."""
import secrets, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import TwitchAccount, User
from routers.auth_users import get_current_user

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def twitch_login(current_user: User = Depends(get_current_user)):
    if not config.TWITCH_CLIENT_ID:
        return RedirectResponse("https://dev.twitch.tv/console/apps/create")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"client_id": config.TWITCH_CLIENT_ID, "redirect_uri": config.TWITCH_REDIRECT_URI,
              "response_type": "code", "scope": " ".join(config.TWITCH_SCOPES), "state": state}
    return RedirectResponse(f"{config.TWITCH_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def twitch_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=twitch_failed")
    user_id = _states.pop(state)

    resp = httpx.post(config.TWITCH_TOKEN_URL, params={
        "client_id": config.TWITCH_CLIENT_ID, "client_secret": config.TWITCH_CLIENT_SECRET,
        "code": code, "grant_type": "authorization_code", "redirect_uri": config.TWITCH_REDIRECT_URI,
    })
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=twitch_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    headers = {"Authorization": f"Bearer {access_token}", "Client-Id": config.TWITCH_CLIENT_ID}
    me_resp = httpx.get("https://api.twitch.tv/helix/users", headers=headers)
    user = me_resp.json().get("data", [{}])[0] if me_resp.status_code == 200 else {}
    twitch_user_id = user.get("id", secrets.token_hex(8))
    username = user.get("login", "")
    display_name = user.get("display_name", "")
    avatar_url = user.get("profile_image_url", "")

    # Followers
    followers = 0
    fol_resp = httpx.get(f"https://api.twitch.tv/helix/channels/followers?broadcaster_id={twitch_user_id}", headers=headers)
    if fol_resp.status_code == 200:
        followers = fol_resp.json().get("total", 0)

    acc = db.query(TwitchAccount).filter_by(user_id_twitch=twitch_user_id, user_id=user_id).first()
    if not acc:
        acc = TwitchAccount(user_id_twitch=twitch_user_id, user_id=user_id)
        db.add(acc)
    acc.username = username; acc.display_name = display_name; acc.avatar_url = avatar_url
    acc.access_token = access_token; acc.refresh_token = refresh_token
    acc.followers = followers; acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=twitch")

@router.get("/accounts")
def list_twitch(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "username": a.username, "display_name": a.display_name,
             "avatar_url": a.avatar_url, "followers": a.followers, "avg_viewers": a.avg_viewers,
             "bits_revenue": a.bits_revenue, "sub_revenue": a.sub_revenue,
             "manual_revenue": a.manual_revenue,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(TwitchAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/revenue")
def update_twitch_revenue(aid: int, revenue: float, current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    a = db.query(TwitchAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.manual_revenue = revenue; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_twitch(aid: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    a = db.query(TwitchAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
