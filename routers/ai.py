"""
Assistant IA — Groq (Llama 3.3 70B) — gratuit
Endpoints : /chat, /daily-tip, /monthly-report, /plan-content, /insights, /history
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from groq import Groq
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config
from database import get_db
from models import (
    YouTubeAccount, InstagramAccount, FacebookPage, TikTokAccount,
    SnapchatAccount, PinterestAccount, TwitchAccount, TwitterAccount,
    LinkedInAccount, SpotifyAccount, PatreonAccount, SubstackNewsletter,
    DiscordServer, DigitalProduct, AIConversation, AIInsight, User,
)
from routers.auth_users import get_current_user

router = APIRouter()


# ── Client ────────────────────────────────────────────────────────────────────

def get_client() -> Groq:
    if not config.GROQ_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY non configuré dans .env — clé gratuite sur console.groq.com"
        )
    return Groq(api_key=config.GROQ_API_KEY)


def chat(client: Groq, system: str, messages: list, max_tokens: int = 1500) -> str:
    """Appel unifié au modèle Groq."""
    response = client.chat.completions.create(
        model=config.GROQ_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
    )
    return response.choices[0].message.content


# ── Contexte dashboard ────────────────────────────────────────────────────────

def build_dashboard_context(db: Session, user_id: int) -> str:
    yt   = db.query(YouTubeAccount).filter_by(user_id=user_id).all()
    ig   = db.query(InstagramAccount).filter_by(user_id=user_id).all()
    fb   = db.query(FacebookPage).filter_by(user_id=user_id).all()
    tt   = db.query(TikTokAccount).filter_by(user_id=user_id).all()
    sc   = db.query(SnapchatAccount).filter_by(user_id=user_id).all()
    pin  = db.query(PinterestAccount).filter_by(user_id=user_id).all()
    twi  = db.query(TwitchAccount).filter_by(user_id=user_id).all()
    tw   = db.query(TwitterAccount).filter_by(user_id=user_id).all()
    li   = db.query(LinkedInAccount).filter_by(user_id=user_id).all()
    sp   = db.query(SpotifyAccount).filter_by(user_id=user_id).all()
    pat  = db.query(PatreonAccount).filter_by(user_id=user_id).all()
    sub  = db.query(SubstackNewsletter).filter_by(user_id=user_id).all()
    dis  = db.query(DiscordServer).filter_by(user_id=user_id).all()
    prod = db.query(DigitalProduct).filter_by(user_id=user_id).all()

    yt_rev   = sum(a.estimated_revenue for a in yt)
    ig_rev   = sum(a.manual_revenue for a in ig)
    tt_rev   = sum(a.manual_revenue for a in tt)
    sc_rev   = sum(a.ad_revenue for a in sc)
    pin_rev  = sum(a.ad_revenue for a in pin)
    twi_rev  = sum(a.manual_revenue for a in twi)
    tw_rev   = sum(a.manual_revenue for a in tw)
    pat_rev  = sum(a.monthly_revenue for a in pat)
    sub_rev  = sum(a.monthly_revenue for a in sub)
    prod_rev = sum(p.monthly_revenue for p in prod)
    total    = yt_rev + ig_rev + tt_rev + sc_rev + pin_rev + twi_rev + tw_rev + pat_rev + sub_rev + prod_rev

    now = datetime.utcnow().strftime("%B %Y")

    return f"""
=== DONNÉES TEMPS RÉEL DU DASHBOARD CRÉA-ACTION ({now}) ===

REVENU TOTAL CONSOLIDÉ : {total:.2f} €

YOUTUBE ({len(yt)} compte(s))
   - Revenu estimé : {yt_rev:.2f} €
   - Abonnés totaux : {sum(a.subscribers for a in yt):,}
   - Vues totales : {sum(a.total_views for a in yt):,}

INSTAGRAM ({len(ig)} compte(s))
   - Revenu (manuel) : {ig_rev:.2f} €
   - Abonnés : {sum(a.followers for a in ig):,}
   - Impressions : {sum(a.impressions for a in ig):,}

FACEBOOK ({len(fb)} page(s))
   - Abonnés : {sum(p.followers for p in fb):,}
   - Portée : {sum(p.reach for p in fb):,}

TIKTOK ({len(tt)} compte(s))
   - Revenu (manuel) : {tt_rev:.2f} €
   - Abonnés : {sum(a.followers for a in tt):,}
   - Vues totales : {sum(a.total_views for a in tt):,}

SNAPCHAT ({len(sc)} compte(s))
   - Revenu pub : {sc_rev:.2f} €  |  Abonnés : {sum(a.followers for a in sc):,}

PINTEREST ({len(pin)} compte(s))
   - Revenu pub : {pin_rev:.2f} €  |  Abonnés : {sum(a.followers for a in pin):,}

TWITCH ({len(twi)} compte(s))
   - Revenu : {twi_rev:.2f} €  |  Abonnés : {sum(a.followers for a in twi):,}

TWITTER/X ({len(tw)} compte(s))
   - Revenu (manuel) : {tw_rev:.2f} €  |  Abonnés : {sum(a.followers for a in tw):,}

LINKEDIN ({len(li)} compte(s)) — Abonnés : {sum(a.followers for a in li):,}

SPOTIFY ({len(sp)} compte(s)) — Auditeurs mensuels : {sum(a.monthly_listeners for a in sp):,}

PATREON ({len(pat)} compte(s))
   - Revenu mensuel récurrent : {pat_rev:.2f} €
   - Nombre de patrons : {sum(a.patron_count for a in pat):,}

SUBSTACK ({len(sub)} newsletter(s))
   - Revenu : {sub_rev:.2f} €
   - Abonnés gratuits : {sum(a.free_subscribers for a in sub):,}
   - Abonnés payants : {sum(a.paid_subscribers for a in sub):,}

DISCORD ({len(dis)} serveur(s)) — Membres : {sum(a.member_count for a in dis):,}

PRODUITS NUMÉRIQUES ({len(prod)}) — Revenu mensuel : {prod_rev:.2f} €

=== FIN DES DONNÉES ===
"""


# ── Schémas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ContentPlanRequest(BaseModel):
    idea: str
    platforms: List[str] = ["youtube", "instagram", "tiktok"]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat")
def ai_chat(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client = get_client()
    context = build_dashboard_context(db, current_user.id)

    system = f"""Tu es CRÉA-IA, l'assistant IA intégré à CRÉA-ACTION — tableau de bord de revenus pour créateurs de contenu.
Tu as accès en temps réel à toutes les données du dashboard.
RÈGLE ABSOLUE : tu réponds TOUJOURS et UNIQUEMENT en français, peu importe la langue du message reçu. Ne jamais utiliser un seul mot anglais sauf les noms propres de plateformes (YouTube, TikTok, Instagram, etc.).
Tu es concis, professionnel et bienveillant.
Tu analyses les performances, suggères des stratégies, crées des plans de contenu et donnes des conseils actionnables.
Quand tu cites des chiffres, utilise les données ci-dessous.

{context}"""

    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    reply = chat(client, system, messages, max_tokens=1500)

    db.add(AIConversation(user_id=current_user.id, role="user", content=request.message))
    db.add(AIConversation(user_id=current_user.id, role="assistant", content=reply))
    db.commit()

    return {"response": reply}


@router.get("/daily-tip")
def get_daily_tip(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    existing = db.query(AIInsight).filter_by(user_id=current_user.id, type="daily_tip", month=today).first()
    if existing:
        return {"tip": existing.content, "cached": True}

    if not config.GROQ_API_KEY:
        return {"tip": "Configurez GROQ_API_KEY dans .env (gratuit sur console.groq.com) pour activer les conseils IA.", "cached": False}

    client = get_client()
    context = build_dashboard_context(db, current_user.id)

    system = f"Tu es CRÉA-IA. Réponds UNIQUEMENT en français. Donne un conseil court et actionnable (3-4 phrases max) basé sur ces données :\n{context}\nFormate : 1 emoji + conseil. Pas de titre."
    tip = chat(client, system, [{"role": "user", "content": "Donne-moi le conseil du jour pour optimiser mes revenus."}], max_tokens=300)

    db.add(AIInsight(user_id=current_user.id, type="daily_tip", title="Conseil du jour", content=tip, month=today))
    db.commit()

    return {"tip": tip, "cached": False}


@router.post("/monthly-report")
def generate_monthly_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client = get_client()
    context = build_dashboard_context(db, current_user.id)
    month = datetime.utcnow().strftime("%Y-%m")

    system = f"Tu es CRÉA-IA, expert en monétisation pour créateurs de contenu. Réponds UNIQUEMENT en français. Génère des rapports clairs, structurés et actionnables.\n{context}"
    report = chat(client, system, [{"role": "user", "content": """Génère un rapport mensuel complet avec :
1. RÉSUMÉ EXÉCUTIF (2-3 phrases)
2. MEILLEURES PLATEFORMES ce mois
3. POINTS D'ATTENTION (ce qui va moins bien)
4. 3 RECOMMANDATIONS PRIORITAIRES
5. OBJECTIFS SUGGÉRÉS pour le mois prochain

Sois concis, chiffré, et actionnable."""}], max_tokens=2000)

    existing = db.query(AIInsight).filter_by(user_id=current_user.id, type="monthly_report", month=month).first()
    if existing:
        existing.content = report
        existing.created_at = datetime.utcnow()
    else:
        db.add(AIInsight(user_id=current_user.id, type="monthly_report", title=f"Rapport {month}", content=report, month=month))
    db.commit()

    return {"report": report, "month": month}


@router.post("/plan-content")
def plan_content(request: ContentPlanRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client = get_client()
    context = build_dashboard_context(db, current_user.id)
    platforms_str = ", ".join(request.platforms)

    system = f"Tu es CRÉA-IA, expert en stratégie de contenu. Tu aides les créateurs à maximiser leur impact sur les réseaux sociaux.\n{context}"
    plan = chat(client, system, [{"role": "user", "content": f"""Idée de contenu : "{request.idea}"
Plateformes cibles : {platforms_str}

Génère un plan de contenu complet avec pour CHAQUE plateforme :
- Titre/Accroche optimisé
- Meilleur moment pour publier
- 5-10 hashtags recommandés
- Description adaptée (ton, longueur, format)
- Conseil spécifique à la plateforme

Formate clairement avec des séparateurs entre plateformes."""}], max_tokens=1500)

    db.add(AIInsight(user_id=current_user.id, type="content_plan", title=f"Plan : {request.idea[:50]}", content=plan))
    db.commit()

    return {"plan": plan, "idea": request.idea, "platforms": request.platforms}


@router.get("/insights")
def get_insights(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), limit: int = 10):
    insights = db.query(AIInsight).filter_by(user_id=current_user.id).order_by(AIInsight.created_at.desc()).limit(limit).all()
    return [
        {"id": i.id, "type": i.type, "title": i.title,
         "content": i.content, "month": i.month,
         "created_at": i.created_at.isoformat()}
        for i in insights
    ]


@router.get("/history")
def get_chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), limit: int = 50):
    messages = db.query(AIConversation).filter_by(user_id=current_user.id).order_by(AIConversation.created_at.asc()).limit(limit).all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]


@router.delete("/history")
def clear_chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AIConversation).filter_by(user_id=current_user.id).delete()
    db.commit()
    return {"status": "cleared"}
