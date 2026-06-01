"""OAuth LinkedIn API."""
import secrets, httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import config
from database import get_db
from models import LinkedInAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_states: dict[str, int] = {}

@router.get("/login")
def linkedin_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.LINKEDIN_CLIENT_ID:
        return RedirectResponse("https://www.linkedin.com/developers/apps/new")
    state = secrets.token_urlsafe(16)
    _states[state] = current_user.id
    params = {"response_type": "code", "client_id": config.LINKEDIN_CLIENT_ID,
              "redirect_uri": config.LINKEDIN_REDIRECT_URI,
              "scope": " ".join(config.LINKEDIN_SCOPES), "state": state}
    return RedirectResponse(f"{config.LINKEDIN_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
def linkedin_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error or not state or state not in _states:
        return RedirectResponse(f"{config.APP_URL}/?error=linkedin_failed")
    user_id = _states.pop(state)

    resp = httpx.post(config.LINKEDIN_TOKEN_URL, data={
        "grant_type": "authorization_code", "code": code,
        "client_id": config.LINKEDIN_CLIENT_ID, "client_secret": config.LINKEDIN_CLIENT_SECRET,
        "redirect_uri": config.LINKEDIN_REDIRECT_URI,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=linkedin_token_failed")
    access_token = resp.json().get("access_token", "")

    me_resp = httpx.get("https://api.linkedin.com/v2/me",
                         params={"projection": "(id,localizedFirstName,localizedLastName,profilePicture(displayImage~digitalmediaAsset:playableStreams))"},
                         headers={"Authorization": f"Bearer {access_token}"})
    me = me_resp.json() if me_resp.status_code == 200 else {}
    account_id = me.get("id", secrets.token_hex(8))
    name = f"{me.get('localizedFirstName', '')} {me.get('localizedLastName', '')}".strip()

    acc = db.query(LinkedInAccount).filter_by(account_id=account_id, user_id=user_id).first()
    if not acc:
        acc = LinkedInAccount(account_id=account_id, user_id=user_id)
        db.add(acc)
    acc.name = name; acc.access_token = access_token; acc.last_updated = datetime.utcnow()
    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=linkedin")

@router.get("/accounts")
def list_linkedin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "account_id": a.account_id, "name": a.name,
             "followers": a.followers, "impressions": a.impressions, "reach": a.reach,
             "manual_revenue": a.manual_revenue,
             "last_updated": a.last_updated.isoformat() if a.last_updated else None}
            for a in db.query(LinkedInAccount).filter_by(user_id=current_user.id).all()]

@router.put("/accounts/{aid}/stats")
def update_linkedin_stats(aid: int, followers: int = 0, impressions: int = 0,
                          current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    a = db.query(LinkedInAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    a.followers = followers; a.impressions = impressions; a.last_updated = datetime.utcnow(); db.commit()
    return {"status": "ok"}

@router.delete("/accounts/{aid}")
def delete_linkedin(aid: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    a = db.query(LinkedInAccount).filter_by(id=aid, user_id=current_user.id).first()
    if not a: raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a); db.commit(); return {"status": "deleted"}
