"""OAuth Spotify Web API."""
import secrets, base64, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import SpotifyAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def spotify_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.SPOTIFY_CLIENT_ID:
        return RedirectResponse("https://developer.spotify.com/dashboard/create")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"client_id": config.SPOTIFY_CLIENT_ID, "response_type": "code",
              "redirect_uri": config.SPOTIFY_REDIRECT_URI, "scope": " ".join(config.SPOTIFY_SCOPES), "state": state}
    return RedirectResponse(f"{config.SPOTIFY_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def spotify_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=spotify_failed")
    user_id = _states.pop(state)

    creds = base64.b64encode(f"{config.SPOTIFY_CLIENT_ID}:{config.SPOTIFY_CLIENT_SECRET}".encode()).decode()
    resp = httpx.post(config.SPOTIFY_TOKEN_URL,
                      headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "authorization_code", "code": code, "redirect_uri": config.SPOTIFY_REDIRECT_URI})
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=spotify_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    me_resp = httpx.get("https://api.spotify.com/v1/me", headers={"Authorization": f"Bearer {access_token}"})
    me = me_resp.json() if me_resp.status_code == 200 else {}
    spotify_id = me.get("id", secrets.token_hex(8))
    display_name = me.get("display_name", "")
    followers = me.get("followers", {}).get("total", 0)
    images = me.get("images", [])
    avatar_url = images[0].get("url", "") if images else ""

    acc = db.query(SpotifyAccount).filter_by(spotify_id=spotify_id, user_id=user_id).first()
    if not acc:
        acc = SpotifyAccount(spotify_id=spotify_id, user_id=user_id)
        db.add(acc)
    acc.display_name = display_name; acc.avatar_url = avatar_url
    acc.access_token = access_token; acc.refresh_token = refresh_token
    acc.followers = followers; acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=spotify")

@router.get("/accounts")
def list_spotify(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "display_name": a.display_name, "avatar_url": a.avatar_url,
             "followers": a.followers, "monthly_listeners": a.monthly_listeners,
             "streams": a.streams, "manual_revenue": a.manual_revenue,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(SpotifyAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/revenue")
def update_spotify_revenue(aid: int, revenue: float, current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    a = db.query(SpotifyAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.manual_revenue = revenue; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_spotify(aid: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    a = db.query(SpotifyAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
