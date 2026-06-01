"""OAuth Patreon API v2 — revenus directs via API."""
import secrets, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import PatreonAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def patreon_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.PATREON_CLIENT_ID:
        return RedirectResponse("https://www.patreon.com/portal/registration/register-clients")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"response_type": "code", "client_id": config.PATREON_CLIENT_ID,
              "redirect_uri": config.PATREON_REDIRECT_URI, "scope": " ".join(config.PATREON_SCOPES), "state": state}
    return RedirectResponse(f"{config.PATREON_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def patreon_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=patreon_failed")
    user_id = _states.pop(state)

    resp = httpx.post(config.PATREON_TOKEN_URL, data={
        "grant_type": "authorization_code", "code": code,
        "client_id": config.PATREON_CLIENT_ID, "client_secret": config.PATREON_CLIENT_SECRET,
        "redirect_uri": config.PATREON_REDIRECT_URI,
    })
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=patreon_token_failed")
    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")

    headers = {"Authorization": f"Bearer {access_token}"}

    # Infos utilisateur
    me_resp = httpx.get("https://www.patreon.com/api/oauth2/v2/identity",
                         params={"fields[user]": "full_name,image_url,url"},
                         headers=headers)
    me_data = me_resp.json().get("data", {}) if me_resp.status_code == 200 else {}
    patreon_id = me_data.get("id", secrets.token_hex(8))
    attrs = me_data.get("attributes", {})
    username = attrs.get("full_name", "")
    avatar_url = attrs.get("image_url", "")

    # Campagne (revenus)
    camp_resp = httpx.get("https://www.patreon.com/api/oauth2/v2/campaigns",
                           params={"fields[campaign]": "patron_count,pledge_sum,currency"},
                           headers=headers)
    patron_count = 0
    monthly_revenue = 0.0
    if camp_resp.status_code == 200:
        campaigns = camp_resp.json().get("data", [])
        for c in campaigns:
            ca = c.get("attributes", {})
            patron_count += ca.get("patron_count", 0)
            # pledge_sum est en cents
            monthly_revenue += ca.get("pledge_sum", 0) / 100

    acc = db.query(PatreonAccount).filter_by(patreon_id=patreon_id, user_id=user_id).first()
    if not acc:
        acc = PatreonAccount(patreon_id=patreon_id, user_id=user_id)
        db.add(acc)
    acc.username = username; acc.avatar_url = avatar_url
    acc.access_token = access_token; acc.refresh_token = refresh_token
    acc.patron_count = patron_count; acc.monthly_revenue = monthly_revenue
    acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=patreon")

@router.get("/accounts")
def list_patreon(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "username": a.username, "avatar_url": a.avatar_url,
             "patron_count": a.patron_count, "monthly_revenue": a.monthly_revenue,
             "new_patrons_month": a.new_patrons_month,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(PatreonAccount).filter_by(user_id=current_user.id).all()]

@router.delete("/accounts/{aid}")
def delete_patreon(aid: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    a = db.query(PatreonAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
