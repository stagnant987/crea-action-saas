"""
OAuth 2.0 YouTube / Google
Flux : /login → Google → /callback → sauvegarde token → redirige frontend
"""
import secrets
import httpx
from datetime import datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import config
from database import get_db
from models import YouTubeAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()

# Stockage temporaire du state OAuth (en mémoire)
_oauth_states: dict[str, int] = {}


@router.get("/login")
def youtube_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    """Démarre le flux OAuth Google — redirige vers la page de consentement Google."""
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.GOOGLE_CLIENT_ID:
        return RedirectResponse("https://console.cloud.google.com/apis/credentials")
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = current_user.id

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(config.GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"{config.GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/callback")
def youtube_callback(code: str = None, state: str = None, error: str = None,
                     db: Session = Depends(get_db)):
    """Reçoit le code d'autorisation Google et échange contre un access token."""
    if error:
        return RedirectResponse(f"{config.APP_URL}/?error=youtube_denied")

    if not state or state not in _oauth_states:
        return RedirectResponse(f"{config.APP_URL}/?error=youtube_invalid_state")

    user_id = _oauth_states.pop(state)

    # Échange code → tokens
    token_data = {
        "code": code,
        "client_id": config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    resp = httpx.post(config.GOOGLE_TOKEN_URL, data=token_data)
    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=youtube_token_failed")

    tokens = resp.json()
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    expires_in = tokens.get("expires_in", 3600)

    # Récupère les infos du channel YouTube
    headers = {"Authorization": f"Bearer {access_token}"}
    ch_resp = httpx.get(
        "https://www.googleapis.com/youtube/v3/channels",
        params={"part": "snippet,statistics", "mine": "true"},
        headers=headers,
    )
    if ch_resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=youtube_api_failed")

    ch_data = ch_resp.json()
    if not ch_data.get("items"):
        return RedirectResponse(f"{config.APP_URL}/?error=youtube_no_channel")

    item = ch_data["items"][0]
    channel_id = item["id"]
    channel_name = item["snippet"]["title"]
    avatar_url = item["snippet"]["thumbnails"].get("default", {}).get("url", "")
    custom_url = item["snippet"].get("customUrl", "")
    subscribers = int(item["statistics"].get("subscriberCount", 0))
    total_views = int(item["statistics"].get("viewCount", 0))

    # Sauvegarde / mise à jour en base
    account = db.query(YouTubeAccount).filter_by(channel_id=channel_id, user_id=user_id).first()
    if not account:
        account = YouTubeAccount(channel_id=channel_id, user_id=user_id)
        db.add(account)

    account.channel_name = channel_name
    account.avatar_url = avatar_url
    account.custom_url = custom_url
    account.access_token = access_token
    account.refresh_token = refresh_token or account.refresh_token
    account.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    account.subscribers = subscribers
    account.total_views = total_views
    account.last_updated = datetime.utcnow()
    db.commit()

    return RedirectResponse(f"{config.APP_URL}/?connected=youtube")


@router.post("/refresh/{account_id}")
def refresh_youtube_token(account_id: int, current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Rafraîchit l'access token YouTube via le refresh token."""
    account = db.query(YouTubeAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    resp = httpx.post(config.GOOGLE_TOKEN_URL, data={
        "client_id": config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET,
        "refresh_token": account.refresh_token,
        "grant_type": "refresh_token",
    })
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Rafraîchissement du token échoué")

    tokens = resp.json()
    account.access_token = tokens["access_token"]
    account.token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
    db.commit()
    return {"status": "ok"}


@router.delete("/disconnect/{account_id}")
def disconnect_youtube(account_id: int, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Supprime un compte YouTube de la base."""
    account = db.query(YouTubeAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(account)
    db.commit()
    return {"status": "disconnected"}


def _sync_account(account, db) -> bool:
    """Resynchronise les stats d'un compte YouTube depuis l'API. Retourne True si succès."""
    try:
        headers = {"Authorization": f"Bearer {account.access_token}"}
        resp = httpx.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "snippet,statistics", "mine": "true"},
            headers=headers,
            timeout=10,
        )
        if resp.status_code != 200:
            return False
        items = resp.json().get("items", [])
        if not items:
            return False
        item = items[0]
        stats = item["statistics"]
        account.subscribers  = int(stats.get("subscriberCount", 0))
        account.total_views  = int(stats.get("viewCount", 0))
        account.channel_name = item["snippet"]["title"]
        account.custom_url   = item["snippet"].get("customUrl", account.custom_url or "")
        account.last_updated = datetime.utcnow()
        db.commit()
        return True
    except Exception:
        return False


@router.get("/accounts")
def list_youtube_accounts(current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Retourne les comptes YouTube en resynchronisant les stats depuis l'API."""
    accounts = db.query(YouTubeAccount).filter_by(user_id=current_user.id).all()
    for a in accounts:
        _sync_account(a, db)
    return [
        {
            "id": a.id,
            "channel_id": a.channel_id,
            "channel_name": a.channel_name,
            "custom_url": a.custom_url or "",
            "avatar_url": a.avatar_url,
            "subscribers": a.subscribers,
            "total_views": a.total_views,
            "monthly_views": a.monthly_views,
            "estimated_revenue": a.estimated_revenue,
            "last_updated": a.last_updated.isoformat() if a.last_updated else None,
        }
        for a in accounts
    ]


@router.put("/accounts/{account_id}/revenue")
def update_youtube_revenue(account_id: int, revenue: float,
                           current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Met à jour manuellement le revenu estimé (si YouTube Analytics non disponible)."""
    account = db.query(YouTubeAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    account.estimated_revenue = revenue
    account.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "ok", "estimated_revenue": revenue}


@router.get("/videos")
def get_youtube_videos(current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Retourne les dernières vidéos des comptes YouTube connectés."""
    accounts = db.query(YouTubeAccount).filter_by(user_id=current_user.id).all()
    all_videos = []
    for account in accounts:
        headers = {"Authorization": f"Bearer {account.access_token}"}
        # Récupère les IDs des dernières vidéos
        search_resp = httpx.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={"part": "snippet", "forMine": "true", "type": "video",
                    "maxResults": 12, "order": "date"},
            headers=headers,
        )
        if search_resp.status_code != 200:
            continue
        items = search_resp.json().get("items", [])
        if not items:
            continue
        video_ids = ",".join(i["id"]["videoId"] for i in items)
        # Récupère les stats pour chaque vidéo
        stats_resp = httpx.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={"part": "statistics,snippet", "id": video_ids},
            headers=headers,
        )
        if stats_resp.status_code != 200:
            continue
        for v in stats_resp.json().get("items", []):
            vid_id = v["id"]
            snippet = v["snippet"]
            stats = v.get("statistics", {})
            all_videos.append({
                "video_id": vid_id,
                "title": snippet.get("title", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "published_at": snippet.get("publishedAt", ""),
                "channel_name": account.channel_name,
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0)),
                "url": f"https://www.youtube.com/watch?v={vid_id}",
            })
    all_videos.sort(key=lambda x: x["published_at"], reverse=True)
    return all_videos
