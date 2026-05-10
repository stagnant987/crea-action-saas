"""CRÉA-ACTION — Point d'entrée FastAPI (v2 — avec IA + 13 plateformes)"""
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os

import config
from database import init_db
from routers import (
    auth_youtube, auth_meta, auth_tiktok,
    auth_snapchat, auth_pinterest, auth_twitch,
    auth_twitter, auth_linkedin, auth_spotify, auth_patreon,
    manual_platforms, custom_platforms, ai,
    dashboard, banking, products, content, plateau_studio,
    auth_users,
)
from routers.auth_users import get_current_user

app = FastAPI(title="CRÉA-ACTION API v2", version="2.0.0", docs_url="/api/docs", redoc_url=None)

# ── Gestionnaire global erreurs Anthropic ─────────────────────────────────────
def _register_anthropic_handlers() -> None:
    try:
        import anthropic  # type: ignore[import]
    except ImportError:
        return

    @app.exception_handler(anthropic.APIError)
    async def _anthropic_error(_request: Request, exc: Exception) -> JSONResponse:
        msg = str(exc)
        if "credit" in msg.lower() or "balance" in msg.lower():
            return JSONResponse(status_code=402, content={
                "detail": "Crédits Anthropic insuffisants. Rechargez sur console.anthropic.com/settings/billing"
            })
        if isinstance(exc, anthropic.AuthenticationError) or "api_key" in msg.lower():
            return JSONResponse(status_code=401, content={
                "detail": "Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans .env"
            })
        return JSONResponse(status_code=400, content={"detail": f"Erreur API Anthropic : {msg}"})

_register_anthropic_handlers()

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")
app.add_middleware(CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── Authentification utilisateurs ─────────────────────────────────────────────
app.include_router(auth_users.router, prefix="/api/users", tags=["Auth Utilisateurs"])

_auth = [Depends(get_current_user)]

# ── OAuth — les /callback sont publics (Google/Meta redirige sans JWT)
#           les autres endpoints exigent auth (géré dans chaque router)
app.include_router(auth_youtube.router,   prefix="/auth/youtube",   tags=["Auth YouTube"])
app.include_router(auth_meta.router,      prefix="/auth/meta",      tags=["Auth Meta"])
app.include_router(auth_tiktok.router,    prefix="/auth/tiktok",    tags=["Auth TikTok"])
app.include_router(auth_snapchat.router,  prefix="/auth/snapchat",  tags=["Auth Snapchat"])
app.include_router(auth_pinterest.router, prefix="/auth/pinterest", tags=["Auth Pinterest"])
app.include_router(auth_twitch.router,    prefix="/auth/twitch",    tags=["Auth Twitch"])
app.include_router(auth_twitter.router,   prefix="/auth/twitter",   tags=["Auth Twitter"])
app.include_router(auth_linkedin.router,  prefix="/auth/linkedin",  tags=["Auth LinkedIn"])
app.include_router(auth_spotify.router,   prefix="/auth/spotify",   tags=["Auth Spotify"])
app.include_router(auth_patreon.router,   prefix="/auth/patreon",   tags=["Auth Patreon"])

# ── Plateformes manuelles ─────────────────────────────────────────────────────
app.include_router(manual_platforms.router, prefix="/api/manual",  tags=["Manuel"],             dependencies=_auth)
app.include_router(custom_platforms.router, prefix="/api/custom",  tags=["Plateformes Custom"], dependencies=_auth)

# ── IA ────────────────────────────────────────────────────────────────────────
app.include_router(ai.router, prefix="/api/ai", tags=["IA Claude"], dependencies=_auth)

# ── API ───────────────────────────────────────────────────────────────────────
app.include_router(dashboard.router,       prefix="/api/dashboard", tags=["Dashboard"],      dependencies=_auth)
app.include_router(banking.router,         prefix="/api/banking",   tags=["Banque"],         dependencies=_auth)
app.include_router(products.router,        prefix="/api/products",  tags=["Produits"],       dependencies=_auth)
app.include_router(content.router,         prefix="/api/content",   tags=["Contenu"],        dependencies=_auth)
app.include_router(plateau_studio.router,  prefix="/api/studio",    tags=["Plateau Studio"], dependencies=_auth)

# ── Frontend ──────────────────────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

async def _auto_sync_loop():
    """Rafraîchit les tokens YouTube expirés toutes les heures."""
    await asyncio.sleep(60)  # Attend 1 min après démarrage
    while True:
        try:
            from database import SessionLocal
            from models import YouTubeAccount
            import httpx
            db = SessionLocal()
            expiry_threshold = datetime.utcnow() + timedelta(minutes=10)
            accounts = db.query(YouTubeAccount).filter(
                YouTubeAccount.token_expiry < expiry_threshold,
                YouTubeAccount.refresh_token != ""
            ).all()
            for acc in accounts:
                try:
                    resp = httpx.post(config.GOOGLE_TOKEN_URL, data={
                        "client_id": config.GOOGLE_CLIENT_ID,
                        "client_secret": config.GOOGLE_CLIENT_SECRET,
                        "refresh_token": acc.refresh_token,
                        "grant_type": "refresh_token",
                    })
                    if resp.status_code == 200:
                        tokens = resp.json()
                        acc.access_token = tokens["access_token"]
                        acc.token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
                        db.commit()
                except Exception:
                    pass
            db.close()
        except Exception:
            pass
        await asyncio.sleep(3600)  # Toutes les heures


@app.on_event("startup")
async def on_startup():
    init_db()
    asyncio.create_task(_auto_sync_loop())
    print("\n" + "-" * 60)
    print("  CREA-ACTION v3  ->  http://localhost:8000")
    print("  PLATEAU STUDIO | IA Claude | 13 plateformes")
    print("  API docs : http://localhost:8000/api/docs")
    print("-" * 60 + "\n")
