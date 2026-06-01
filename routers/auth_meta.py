"""
OAuth 2.0 Meta — Instagram + Facebook
Une seule app Meta, un seul flux OAuth, deux sources de données.
"""
import secrets
import httpx
from datetime import datetime
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import config
from database import get_db
from models import InstagramAccount, FacebookPage, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_oauth_states: dict[str, int] = {}

GRAPH = "https://graph.facebook.com/v18.0"


@router.get("/login")
def meta_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    """Démarre le flux OAuth Meta (Facebook + Instagram)."""
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.META_APP_ID:
        return RedirectResponse("https://developers.facebook.com/apps/")

    state = secrets.token_urlsafe(16)
    _oauth_states[state] = current_user.id

    params = {
        "client_id": config.META_APP_ID,
        "redirect_uri": config.META_REDIRECT_URI,
        "response_type": "code",
        "scope": ",".join(config.META_SCOPES),
        "state": state,
    }
    return RedirectResponse(f"{config.META_AUTH_URL}?{urlencode(params)}")


@router.get("/callback")
def meta_callback(code: str = None, state: str = None, error: str = None,
                  db: Session = Depends(get_db)):
    """Reçoit le code Meta et récupère les données Instagram + Facebook."""
    if error:
        return RedirectResponse(f"{config.APP_URL}/?error=meta_denied")

    if not state or state not in _oauth_states:
        return RedirectResponse(f"{config.APP_URL}/?error=meta_invalid_state")
    user_id = _oauth_states.pop(state)

    # Échange code → token
    resp = httpx.get(config.META_TOKEN_URL, params={
        "client_id": config.META_APP_ID,
        "client_secret": config.META_APP_SECRET,
        "redirect_uri": config.META_REDIRECT_URI,
        "code": code,
    })
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=meta_token_failed")

    access_token = resp.json().get("access_token", "")

    # ── Facebook Pages ────────────────────────────────────────────────────────
    pages_resp = httpx.get(f"{GRAPH}/me/accounts", params={
        "access_token": access_token,
        "fields": "id,name,picture,fan_count",
    })
    if pages_resp.status_code == 200:
        for page in pages_resp.json().get("data", []):
            page_id = page["id"]
            page_token = page.get("access_token", access_token)
            fp = db.query(FacebookPage).filter_by(page_id=page_id, user_id=user_id).first()
            if not fp:
                fp = FacebookPage(page_id=page_id, user_id=user_id)
                db.add(fp)
            fp.page_name = page.get("name", "")
            fp.avatar_url = page.get("picture", {}).get("data", {}).get("url", "")
            fp.access_token = page_token
            fp.followers = page.get("fan_count", 0)
            fp.last_updated = datetime.utcnow()

    # ── Instagram Business Accounts ───────────────────────────────────────────
    ig_resp = httpx.get(f"{GRAPH}/me", params={
        "access_token": access_token,
        "fields": "instagram_business_account{id,username,profile_picture_url,followers_count}",
    })
    if ig_resp.status_code == 200:
        ig_data = ig_resp.json().get("instagram_business_account")
        if ig_data:
            acct_id = ig_data["id"]
            ig = db.query(InstagramAccount).filter_by(account_id=acct_id, user_id=user_id).first()
            if not ig:
                ig = InstagramAccount(account_id=acct_id, user_id=user_id)
                db.add(ig)
            ig.username = ig_data.get("username", "")
            ig.avatar_url = ig_data.get("profile_picture_url", "")
            ig.access_token = access_token
            ig.followers = ig_data.get("followers_count", 0)
            ig.last_updated = datetime.utcnow()

            # Insights (impressions / reach — 7 jours)
            insights_resp = httpx.get(f"{GRAPH}/{acct_id}/insights", params={
                "metric": "impressions,reach",
                "period": "month",
                "access_token": access_token,
            })
            if insights_resp.status_code == 200:
                for metric in insights_resp.json().get("data", []):
                    val = metric.get("values", [{}])[-1].get("value", 0)
                    if metric["name"] == "impressions":
                        ig.impressions = val
                    elif metric["name"] == "reach":
                        ig.reach = val

    db.commit()
    return RedirectResponse(f"{config.APP_URL}/?connected=meta")


# ── Endpoints lecture ─────────────────────────────────────────────────────────

@router.get("/instagram/accounts")
def list_instagram(current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    accounts = db.query(InstagramAccount).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": a.id, "account_id": a.account_id, "username": a.username,
            "avatar_url": a.avatar_url, "followers": a.followers,
            "impressions": a.impressions, "reach": a.reach,
            "engagement_rate": a.engagement_rate, "manual_revenue": a.manual_revenue,
            "last_updated": a.last_updated.isoformat() if a.last_updated else None,
        }
        for a in accounts
    ]


@router.put("/instagram/{account_id}/revenue")
def update_instagram_revenue(account_id: int, revenue: float,
                              current_user: User = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    a = db.query(InstagramAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    a.manual_revenue = revenue
    a.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.delete("/instagram/{account_id}")
def delete_instagram(account_id: int, current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    a = db.query(InstagramAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a)
    db.commit()
    return {"status": "deleted"}


@router.get("/facebook/pages")
def list_facebook(current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    pages = db.query(FacebookPage).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": p.id, "page_id": p.page_id, "page_name": p.page_name,
            "avatar_url": p.avatar_url, "followers": p.followers,
            "reach": p.reach, "ad_clicks": p.ad_clicks,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in pages
    ]


@router.delete("/facebook/{page_id}")
def delete_facebook(page_id: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    p = db.query(FacebookPage).filter_by(id=page_id, user_id=current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page introuvable")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}
