"""OAuth 2.0 Twitter/X API v2 — avec PKCE."""
import secrets, hashlib, base64, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import TwitterAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_states: dict[str, int] = {}
_verifiers: dict = {}

def _verifier(): return secrets.token_urlsafe(64)
def _challenge(v): return base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b"=").decode()

@router.get("/login")
def twitter_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.TWITTER_CLIENT_ID:
        return RedirectResponse("https://developer.twitter.com/en/portal/dashboard")
    state = secrets.token_urlsafe(16)
    verifier = _verifier()
    _states[state] = current_user.id; _verifiers[state] = verifier
    params = {"response_type": "code", "client_id": config.TWITTER_CLIENT_ID,
              "redirect_uri": config.TWITTER_REDIRECT_URI, "scope": " ".join(config.TWITTER_SCOPES),
              "state": state, "code_challenge": _challenge(verifier), "code_challenge_method": "S256"}
    return RedirectResponse(f"{config.TWITTER_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def twitter_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=twitter_failed")
    user_id = _states.pop(state)
    verifier = _verifiers.pop(state, "")

    resp = httpx.post(config.TWITTER_TOKEN_URL,
                      auth=(config.TWITTER_CLIENT_ID, config.TWITTER_CLIENT_SECRET),
                      data={"grant_type": "authorization_code", "code": code,
                            "redirect_uri": config.TWITTER_REDIRECT_URI, "code_verifier": verifier})
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=twitter_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    me_resp = httpx.get("https://api.twitter.com/2/users/me",
                         params={"user.fields": "public_metrics,profile_image_url"},
                         headers={"Authorization": f"Bearer {access_token}"})
    me = me_resp.json().get("data", {}) if me_resp.status_code == 200 else {}
    twitter_user_id = me.get("id", secrets.token_hex(8))
    username = me.get("username", "")
    display_name = me.get("name", "")
    followers = me.get("public_metrics", {}).get("followers_count", 0)

    acc = db.query(TwitterAccount).filter_by(twitter_user_id=twitter_user_id, user_id=user_id).first()
    if not acc:
        acc = TwitterAccount(twitter_user_id=twitter_user_id, user_id=user_id)
        db.add(acc)
    acc.username = username; acc.display_name = display_name
    acc.access_token = access_token; acc.refresh_token = refresh_token
    acc.followers = followers; acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=twitter")

@router.get("/accounts")
def list_twitter(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "username": a.username, "display_name": a.display_name,
             "followers": a.followers, "impressions": a.impressions,
             "engagement_rate": a.engagement_rate, "manual_revenue": a.manual_revenue,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(TwitterAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/revenue")
def update_tw_revenue(aid: int, revenue: float, current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    a = db.query(TwitterAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.manual_revenue = revenue; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_twitter(aid: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    a = db.query(TwitterAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
