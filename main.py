"""CRÉA-ACTION — Point d'entrée FastAPI (v3 — avec IA + 13 plateformes)"""
import asyncio
from contextlib import asynccontextmanager
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


async def _auto_sync_loop():
    """Rafraîchit les tokens YouTube expirés toutes les heures."""
    await asyncio.sleep(60)
    while True:
        try:
            import httpx
            from database import SessionLocal
            from models import YouTubeAccount
            db = SessionLocal()
            expiry_threshold = datetime.utcnow() + timedelta(minutes=10)
            accounts = db.query(YouTubeAccount).filter(
                YouTubeAccount.token_expiry < expiry_threshold,
                YouTubeAccount.refresh_token != ""
            ).all()
            async with httpx.AsyncClient() as client:
                for acc in accounts:
                    try:
                        resp = await client.post(config.GOOGLE_TOKEN_URL, data={
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
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    asyncio.create_task(_auto_sync_loop())
    print("\n" + "-" * 60)
    print("  CREA-ACTION v3  ->  http://localhost:8000")
    print("  PLATEAU STUDIO | IA Claude | 13 plateformes")
    print("  API docs : http://localhost:8000/api/docs")
    print("-" * 60 + "\n")
    yield


app = FastAPI(title="CRÉA-ACTION API v3", version="3.0.0", docs_url="/api/docs", redoc_url=None, lifespan=lifespan)

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

_LANDING_HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRÉA-ACTION — Creator Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#0f0f0f;color:#fff;min-height:100vh}
.hero{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center}
.logo{font-size:3rem;font-weight:900;letter-spacing:4px;color:#7c3aed;margin-bottom:12px}
.tagline{font-size:1.2rem;color:#aaa;margin-bottom:40px}
.features{display:flex;gap:24px;flex-wrap:wrap;justify-content:center;margin-bottom:48px}
.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;width:220px}
.card h3{color:#7c3aed;margin-bottom:8px;font-size:1rem}
.card p{color:#888;font-size:0.85rem;line-height:1.5}
.cta{background:#7c3aed;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem}
.cta:hover{background:#6d28d9}
.platforms{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:32px 0;opacity:.6;font-size:.85rem;color:#888}
</style>
</head>
<body>
<div class="hero">
  <div class="logo">CRÉA-ACTION</div>
  <div class="tagline">All-in-one analytics dashboard for content creators</div>
  <div class="features">
    <div class="card"><h3>📊 Analytics</h3><p>Track views, followers, likes and revenue across all your platforms in one place.</p></div>
    <div class="card"><h3>🔗 13 Platforms</h3><p>YouTube, TikTok, Instagram, Twitch, Twitter, Spotify, Pinterest and more.</p></div>
    <div class="card"><h3>🤖 AI Assistant</h3><p>Get content ideas, captions and strategy advice powered by Claude AI.</p></div>
    <div class="card"><h3>💰 Revenue</h3><p>Monitor your earnings from every platform and product in one dashboard.</p></div>
  </div>
  <div class="platforms">YouTube · TikTok · Instagram · Facebook · Twitch · Twitter/X · LinkedIn · Spotify · Pinterest · Snapchat · Patreon</div>
  <a href="/app" class="cta">Open Dashboard →</a>
</div>
</body>
</html>"""

@app.get("/", include_in_schema=False)
def serve_landing():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(_LANDING_HTML)

@app.get("/app", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/tiktokSRDD0qQly5A5KmsYXhR5hYqZsau7qjdx.txt", include_in_schema=False)
def tiktok_verify():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("tiktok-developers-site-verification=SRDD0qQly5A5KmsYXhR5hYqZsau7qjdx")


_LEGAL_HTML = """<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — CRÉA-ACTION</title>
<style>body{{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}}h1{{color:#7c3aed}}a{{color:#7c3aed}}</style>
</head><body>
<h1>CRÉA-ACTION — {title}</h1>
<p><strong>Application :</strong> CRÉA-ACTION | <strong>Contact :</strong> thnpatiri@gmail.com</p>
<p><strong>Dernière mise à jour :</strong> 25 mai 2026</p>
{body}
<p><a href="/">← Retour au tableau de bord</a></p>
</body></html>"""

_PRIVACY_BODY = """
<h2>Données collectées</h2>
<p>CRÉA-ACTION collecte les données suivantes via les APIs des plateformes sociales (YouTube, TikTok, Instagram, etc.) uniquement avec votre consentement explicite :</p>
<ul>
<li>Informations de profil public (nom, avatar)</li>
<li>Statistiques de contenu (vues, abonnés, likes)</li>
<li>Tokens d'accès OAuth (stockés de manière sécurisée)</li>
</ul>
<h2>Utilisation des données</h2>
<p>Les données sont utilisées exclusivement pour afficher vos statistiques dans votre tableau de bord personnel. Elles ne sont jamais vendues ni partagées avec des tiers.</p>
<h2>Suppression des données</h2>
<p>Vous pouvez déconnecter vos comptes et supprimer vos données à tout moment depuis le tableau de bord.</p>
<h2>Contact</h2>
<p>Pour toute question : thnpatiri@gmail.com</p>"""

_TERMS_BODY = """
<h2>Utilisation du service</h2>
<p>CRÉA-ACTION est un tableau de bord analytique pour créateurs de contenu. En utilisant ce service, vous acceptez de :</p>
<ul>
<li>Utiliser le service uniquement à des fins légales</li>
<li>Ne pas tenter de contourner les mécanismes de sécurité</li>
<li>Respecter les conditions d'utilisation des plateformes tierces connectées</li>
</ul>
<h2>Limitation de responsabilité</h2>
<p>CRÉA-ACTION n'est pas responsable des interruptions de service des APIs tierces (TikTok, YouTube, etc.).</p>
<h2>Contact</h2>
<p>Pour toute question : thnpatiri@gmail.com</p>"""


@app.get("/privacy", include_in_schema=False)
def privacy_policy():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(_LEGAL_HTML.format(title="Politique de confidentialité", body=_PRIVACY_BODY))


@app.get("/terms", include_in_schema=False)
def terms_of_service():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(_LEGAL_HTML.format(title="Conditions d'utilisation", body=_TERMS_BODY))
