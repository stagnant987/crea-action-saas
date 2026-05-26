"""
OAuth 2.0 TikTok Login Kit v2
Flux : /login → TikTok → /callback → sauvegarde → redirige frontend
"""
import secrets
import hashlib
import base64
import httpx
from datetime import datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import config
from database import get_db
from models import TikTokAccount, User
from routers.auth_users import get_current_user, get_user_from_token_str

router = APIRouter()
_oauth_states: dict[str, int] = {}
_code_verifiers: dict[str, str] = {}  # PKCE


def _make_code_verifier() -> str:
    return secrets.token_urlsafe(64)


def _make_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


@router.get("/login")
def tiktok_login(t: str = Query(default=None), db: Session = Depends(get_db)):
    """Démarre le flux OAuth TikTok avec PKCE."""
    if not t:
        raise HTTPException(status_code=401, detail="Token manquant — utilisez le bouton Connecter depuis le dashboard")
    current_user = get_user_from_token_str(t, db)
    if not config.TIKTOK_CLIENT_KEY:
        return RedirectResponse("https://developers.tiktok.com/apps/")

    state = secrets.token_urlsafe(16)
    verifier = _make_code_verifier()
    challenge = _make_code_challenge(verifier)

    _oauth_states[state] = current_user.id
    _code_verifiers[state] = verifier

    params = {
        "client_key": config.TIKTOK_CLIENT_KEY,
        "redirect_uri": config.TIKTOK_REDIRECT_URI,
        "response_type": "code",
        "scope": ",".join(config.TIKTOK_SCOPES),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return RedirectResponse(f"{config.TIKTOK_AUTH_URL}?{urlencode(params)}")


@router.get("/callback")
def tiktok_callback(code: str = None, state: str = None, error: str = None,
                    db: Session = Depends(get_db)):
    """Reçoit le code TikTok et récupère les infos du créateur."""
    if error:
        return RedirectResponse(f"{config.APP_URL}/?error=tiktok_denied")

    if not state or state not in _oauth_states:
        return RedirectResponse(f"{config.APP_URL}/?error=tiktok_invalid_state")

    user_id = _oauth_states.pop(state)
    verifier = _code_verifiers.pop(state, "")

    # Échange code → tokens
    resp = httpx.post(config.TIKTOK_TOKEN_URL, data={
        "client_key": config.TIKTOK_CLIENT_KEY,
        "client_secret": config.TIKTOK_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": config.TIKTOK_REDIRECT_URI,
        "code_verifier": verifier,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})

    if resp.status_code != 200:
        return RedirectResponse(f"{config.APP_URL}/?error=tiktok_token_failed")

    token_json = resp.json()
    data = token_json.get("data", token_json)  # certaines réponses ne sont pas nestées sous "data"
    access_token = data.get("access_token", "")
    refresh_token = data.get("refresh_token", "")
    open_id = data.get("open_id", "")
    expires_in = data.get("expires_in", 86400)

    if not access_token or not open_id:
        err = token_json.get("error", {})
        err_msg = err.get("message", "token vide") if isinstance(err, dict) else str(err)
        return RedirectResponse(f"{config.APP_URL}/?error=tiktok_token_failed&detail={err_msg[:80]}")

    # Récupère le profil
    display_name = ""
    avatar_url = ""
    followers = 0

    try:
        user_resp = httpx.get(
            "https://open.tiktokapis.com/v2/user/info/",
            params={"fields": "open_id,display_name,avatar_url,follower_count,video_count"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if user_resp.status_code == 200:
            u = user_resp.json().get("data", {}).get("user", {})
            display_name = u.get("display_name", "")
            avatar_url = u.get("avatar_url", "")
            followers = u.get("follower_count", 0)
    except Exception:
        pass  # profil non critique, on continue avec les données du token

    # Sauvegarde
    account = db.query(TikTokAccount).filter_by(open_id=open_id, user_id=user_id).first()
    if not account:
        account = TikTokAccount(open_id=open_id, user_id=user_id)
        db.add(account)

    account.display_name = display_name
    account.access_token = access_token
    account.refresh_token = refresh_token
    account.followers = followers
    account.avatar_url = avatar_url
    account.last_updated = datetime.utcnow()
    db.commit()

    return RedirectResponse(f"{config.APP_URL}/?connected=tiktok")


@router.get("/videos")
def list_tiktok_videos(current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Récupère les vidéos TikTok depuis l'API."""
    account = db.query(TikTokAccount).filter_by(user_id=current_user.id).first()
    if not account or not account.access_token:
        raise HTTPException(404, "Aucun compte TikTok connecté")
    try:
        resp = httpx.post(
            "https://open.tiktokapis.com/v2/video/list/",
            params={"fields": "id,title,cover_image_url,share_url,view_count,like_count,comment_count,duration,create_time"},
            json={"max_count": 20},
            headers={"Authorization": f"Bearer {account.access_token}",
                     "Content-Type": "application/json"},
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            videos = data.get("videos", [])
            return {"videos": videos, "has_more": data.get("has_more", False)}
        return {"videos": [], "has_more": False}
    except Exception:
        return {"videos": [], "has_more": False}


@router.get("/accounts")
def list_tiktok_accounts(current_user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    accounts = db.query(TikTokAccount).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": a.id, "open_id": a.open_id, "username": a.username,
            "display_name": a.display_name, "avatar_url": a.avatar_url,
            "followers": a.followers, "total_views": a.total_views,
            "likes": a.likes, "shares": a.shares,
            "manual_revenue": a.manual_revenue,
            "last_updated": a.last_updated.isoformat() if a.last_updated else None,
        }
        for a in accounts
    ]


@router.put("/accounts/{account_id}/revenue")
def update_tiktok_revenue(account_id: int, revenue: float,
                          current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    a = db.query(TikTokAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    a.manual_revenue = revenue
    a.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.post("/publish-video")
async def publish_tiktok_video(
    title: str = Form(default="CRÉA-ACTION"),
    privacy_level: str = Form(default="SELF_ONLY"),
    video: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publie une vidéo directement sur TikTok via le Content Posting API."""
    account = db.query(TikTokAccount).filter_by(user_id=current_user.id).first()
    if not account or not account.access_token:
        raise HTTPException(404, "Aucun compte TikTok connecté — reconnecte ton compte avec les nouvelles permissions.")

    content = await video.read()
    size = len(content)

    init_resp = httpx.post(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        json={
            "post_info": {
                "title": title[:150],
                "privacy_level": privacy_level,
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            },
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": size,
                "chunk_size": size,
                "total_chunk_count": 1,
            },
        },
        headers={
            "Authorization": f"Bearer {account.access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        timeout=30,
    )

    if init_resp.status_code != 200:
        err = init_resp.json().get("error", {}).get("message", init_resp.text[:300])
        raise HTTPException(400, f"TikTok init échoué : {err}")

    data = init_resp.json().get("data", {})
    upload_url = data.get("upload_url")
    publish_id = data.get("publish_id")
    if not upload_url:
        raise HTTPException(400, "TikTok n'a pas retourné d'URL d'upload")

    upload_resp = httpx.put(
        upload_url,
        content=content,
        headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
            "Content-Length": str(size),
        },
        timeout=120,
    )

    if upload_resp.status_code not in (200, 201, 204):
        raise HTTPException(400, f"Upload TikTok échoué (HTTP {upload_resp.status_code})")

    return {"status": "ok", "publish_id": publish_id, "message": "Vidéo envoyée à TikTok ! Elle sera visible dans quelques minutes."}


@router.delete("/accounts/{account_id}")
def disconnect_tiktok(account_id: int, current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    a = db.query(TikTokAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(a)
    db.commit()
    return {"status": "disconnected"}
