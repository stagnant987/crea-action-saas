"""
PLATEAU STUDIO — Hub IA Central
4 modules :
  A. Recherche de Tendances
  B. Tests & Expérimentations A/B
  C. Génération de Contenu IA
  D. Automatisation & Optimisation
"""
import random
from datetime import datetime
from typing import List, Optional

import httpx
from groq import Groq
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config
from database import get_db
from models import (
    TrendAnalysis, ContentIdea, ABExperiment, Opportunity,
    YouTubeAccount, InstagramAccount, TikTokAccount,
    PatreonAccount, DigitalProduct, AIInsight, User
)
from routers.auth_users import get_current_user

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client() -> Groq:
    if not config.GROQ_API_KEY:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY non configuré dans .env — clé gratuite sur console.groq.com")
    return Groq(api_key=config.GROQ_API_KEY)


def _groq_ask(client: Groq, system: str, user: str, max_tokens: int = 1500) -> str:
    resp = client.chat.completions.create(
        model=config.GROQ_MODEL,
        max_tokens=max_tokens,
        temperature=0.7,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ]
    )
    return resp.choices[0].message.content or ""


def build_revenue_context(db: Session, user_id: int) -> str:
    yt_rev   = sum(a.estimated_revenue for a in db.query(YouTubeAccount).filter_by(user_id=user_id).all())
    ig_rev   = sum(a.manual_revenue    for a in db.query(InstagramAccount).filter_by(user_id=user_id).all())
    tt_rev   = sum(a.manual_revenue    for a in db.query(TikTokAccount).filter_by(user_id=user_id).all())
    pat_rev  = sum(a.monthly_revenue   for a in db.query(PatreonAccount).filter_by(user_id=user_id).all())
    prod_rev = sum(p.monthly_revenue   for p in db.query(DigitalProduct).filter_by(user_id=user_id).all())
    total    = yt_rev + ig_rev + tt_rev + pat_rev + prod_rev
    return f"Revenus actuels: total={total:.0f}€, YouTube={yt_rev:.0f}€, Instagram={ig_rev:.0f}€, TikTok={tt_rev:.0f}€, Patreon={pat_rev:.0f}€, Produits={prod_rev:.0f}€"


# ── Schémas ────────────────────────────────────────────────────────────────────

class TrendCreate(BaseModel):
    niche: str
    platform: str
    description: str = ""

class TrendUpdate(BaseModel):
    status: str  # active | testing | archived

class ExperimentCreate(BaseModel):
    title: str
    hypothesis: str
    variant_a: str
    variant_b: str
    platform: str = "general"

class ExperimentUpdate(BaseModel):
    status: Optional[str] = None   # running | completed | paused
    winner: Optional[str] = None   # a | b | none
    insights: Optional[str] = None

class ContentIdeaCreate(BaseModel):
    title: str
    platform: str
    content_type: str  # video | post | visual | product | email
    brief: str = ""

class OpportunityCreate(BaseModel):
    title: str
    niche: str
    platform: str
    notes: str = ""

class AIAnalyzeRequest(BaseModel):
    context: str
    module: str  # trends | experiments | content | automation

class AIGenerateContentRequest(BaseModel):
    title: str
    platform: str
    content_type: str
    brief: str = ""
    tone: str = "engageant"

class AIFindTrendsRequest(BaseModel):
    niche: str = ""
    platforms: List[str] = []


# ══════════════════════════════════════════════════════════════════════════════
#  MODULE A — TENDANCES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/trends")
def list_trends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trends = db.query(TrendAnalysis).filter_by(user_id=current_user.id).order_by(TrendAnalysis.score.desc()).all()
    return [_trend_dict(t) for t in trends]


@router.post("/trends")
def create_trend(data: TrendCreate, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    t = TrendAnalysis(
        niche=data.niche,
        platform=data.platform,
        description=data.description,
        score=_auto_score(),
        revenue_potential=random.randint(1, 10),
        competition=random.randint(1, 10),
        ease=random.randint(1, 10),
        status="active",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _trend_dict(t)


@router.put("/trends/{trend_id}")
def update_trend(trend_id: int, data: TrendUpdate,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    t = db.query(TrendAnalysis).filter_by(id=trend_id, user_id=current_user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tendance introuvable")
    t.status = data.status
    db.commit()
    return {"status": "updated"}


@router.delete("/trends/{trend_id}")
def delete_trend(trend_id: int, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    t = db.query(TrendAnalysis).filter_by(id=trend_id, user_id=current_user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tendance introuvable")
    db.delete(t)
    db.commit()
    return {"status": "deleted"}


@router.post("/trends/ai-detect")
def ai_detect_trends(request: AIFindTrendsRequest,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Utilise Claude pour détecter des tendances rentables."""
    client = get_client()
    rev_ctx = build_revenue_context(db, current_user.id)
    niche_str = request.niche or "contenu digital général"
    platforms_str = ", ".join(request.platforms) if request.platforms else "TikTok, YouTube, Instagram"

    raw = _groq_ask(
        client,
        system=f"Tu es un expert en marketing digital et tendances virales. Réponds UNIQUEMENT en français sauf les noms de plateformes.\nContexte business de l'utilisateur: {rev_ctx}\nGénère des analyses de tendances concrètes et actionnables en JSON.",
        user=f"""Identifie 5 tendances rentables dans la niche "{niche_str}" sur {platforms_str}.

Pour chaque tendance, retourne un JSON avec ces champs EXACTEMENT :
{{
  "trends": [
    {{
      "niche": "nom de la niche",
      "platform": "plateforme principale",
      "description": "description de la tendance (2-3 phrases)",
      "revenue_potential": 8,
      "competition": 4,
      "ease": 7,
      "score": 75
    }}
  ]
}}

Sois précis, chiffré, et focus sur la monétisation maximale.""",
        max_tokens=1500,
    )
    # Essayer de parser le JSON
    import json, re
    try:
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            trends_data = parsed.get("trends", [])
            saved = []
            for td in trends_data[:5]:
                t = TrendAnalysis(
                    niche=td.get("niche", ""),
                    platform=td.get("platform", ""),
                    description=td.get("description", ""),
                    revenue_potential=td.get("revenue_potential", 5),
                    competition=td.get("competition", 5),
                    ease=td.get("ease", 5),
                    score=td.get("score", 50),
                    status="active",
                    user_id=current_user.id,
                    created_at=datetime.utcnow(),
                )
                db.add(t)
                db.commit()
                db.refresh(t)
                saved.append(_trend_dict(t))
            return {"trends": saved, "raw": raw}
    except Exception:
        pass

    return {"trends": [], "raw": raw, "error": "Impossible de parser la réponse IA"}


def _trend_dict(t):
    return {
        "id": t.id, "niche": t.niche, "platform": t.platform,
        "description": t.description, "score": t.score,
        "revenue_potential": t.revenue_potential, "competition": t.competition,
        "ease": t.ease, "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  MODULE B — EXPÉRIMENTATIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/experiments")
def list_experiments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exps = db.query(ABExperiment).filter_by(user_id=current_user.id).order_by(ABExperiment.created_at.desc()).all()
    return [_exp_dict(e) for e in exps]


@router.post("/experiments")
def create_experiment(data: ExperimentCreate,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    e = ABExperiment(
        title=data.title,
        hypothesis=data.hypothesis,
        variant_a=data.variant_a,
        variant_b=data.variant_b,
        platform=data.platform,
        status="running",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _exp_dict(e)


@router.put("/experiments/{exp_id}")
def update_experiment(exp_id: int, data: ExperimentUpdate,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    e = db.query(ABExperiment).filter_by(id=exp_id, user_id=current_user.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    if data.status is not None:
        e.status = data.status
    if data.winner is not None:
        e.winner = data.winner
    if data.insights is not None:
        e.insights = data.insights
    db.commit()
    return {"status": "updated"}


@router.delete("/experiments/{exp_id}")
def delete_experiment(exp_id: int, current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    e = db.query(ABExperiment).filter_by(id=exp_id, user_id=current_user.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    db.delete(e)
    db.commit()
    return {"status": "deleted"}


@router.post("/experiments/{exp_id}/analyze")
def analyze_experiment(exp_id: int, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Demande à Claude d'analyser les résultats et de choisir le gagnant."""
    e = db.query(ABExperiment).filter_by(id=exp_id, user_id=current_user.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expérience introuvable")

    client = get_client()
    analysis = _groq_ask(
        client,
        system="Tu es un expert en tests A/B et optimisation de contenu digital.",
        user=f"""Analyse ce test A/B et donne ta recommandation :

Test: {e.title}
Hypothèse: {e.hypothesis}
Variante A: {e.variant_a}
Variante B: {e.variant_b}
Plateforme: {e.platform}

Réponds en 3-4 phrases max. Détermine quelle variante est probablement gagnante et pourquoi.
Termine par "GAGNANT: A" ou "GAGNANT: B" ou "GAGNANT: ÉGALITÉ".""",
        max_tokens=500,
    )
    winner = "none"
    if "GAGNANT: A" in analysis:
        winner = "a"
    elif "GAGNANT: B" in analysis:
        winner = "b"

    e.insights = analysis
    e.winner = winner
    e.status = "completed"
    db.commit()

    return {"analysis": analysis, "winner": winner}


def _exp_dict(e):
    return {
        "id": e.id, "title": e.title, "hypothesis": e.hypothesis,
        "variant_a": e.variant_a, "variant_b": e.variant_b,
        "platform": e.platform, "status": e.status,
        "winner": e.winner, "insights": e.insights,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  MODULE C — GÉNÉRATION DE CONTENU IA
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/content-ideas")
def list_content_ideas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ideas = db.query(ContentIdea).filter_by(user_id=current_user.id).order_by(ContentIdea.ai_score.desc()).all()
    return [_idea_dict(i) for i in ideas]


@router.post("/content-ideas")
def create_content_idea(data: ContentIdeaCreate,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    idea = ContentIdea(
        title=data.title,
        platform=data.platform,
        content_type=data.content_type,
        brief=data.brief,
        ai_score=_auto_score(),
        status="draft",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return _idea_dict(idea)


@router.delete("/content-ideas/{idea_id}")
def delete_content_idea(idea_id: int, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    idea = db.query(ContentIdea).filter_by(id=idea_id, user_id=current_user.id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idée introuvable")
    db.delete(idea)
    db.commit()
    return {"status": "deleted"}


@router.post("/content-ideas/generate")
def ai_generate_content(request: AIGenerateContentRequest,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Génère du contenu complet avec Claude."""
    client = get_client()
    rev_ctx = build_revenue_context(db, current_user.id)

    type_prompts = {
        "video": "Script vidéo complet avec accroche, développement et call-to-action",
        "post": "Post réseaux sociaux optimisé avec hashtags et émojis",
        "visual": "Concept visuel détaillé (description, palette, message clé)",
        "product": "Fiche produit digital complète (titre, description, prix suggéré, arguments de vente)",
        "email": "Email marketing complet (objet, corps, CTA)",
    }
    format_prompt = type_prompts.get(request.content_type, "Contenu optimisé")

    generated = _groq_ask(
        client,
        system=f"Tu es un expert en création de contenu digital viral et en monétisation. {rev_ctx}",
        user=f"""Génère un {format_prompt} pour :

Titre/Idée : {request.title}
Plateforme : {request.platform}
Ton : {request.tone}
Brief : {request.brief or "Aucun brief supplémentaire"}

Optimise pour la viralité et la monétisation maximale.""",
        max_tokens=1500,
    )

    idea = ContentIdea(
        title=request.title,
        platform=request.platform,
        content_type=request.content_type,
        brief=request.brief,
        generated_body=generated,
        ai_score=_auto_score(),
        status="generated",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)

    return {"idea": _idea_dict(idea), "generated": generated}


@router.post("/content-ideas/batch-generate")
def ai_batch_generate(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Génère 5 idées de contenu rentables en masse."""
    client = get_client()
    rev_ctx = build_revenue_context(db, current_user.id)

    ideas = _groq_ask(
        client,
        system=f"Tu es un stratège en contenu digital. {rev_ctx}",
        user="""Génère 5 idées de contenu à fort potentiel de revenu.
Pour chaque idée, donne :
1. **TITRE** : Accroche clé
2. **PLATEFORME** : TikTok / YouTube / Instagram / etc.
3. **FORMAT** : Vidéo / Post / Produit / Email
4. **POTENTIEL** : Score /10 et estimation revenus
5. **STRATÉGIE** : 2 phrases sur comment monétiser

Focus sur ce qui peut générer des revenus rapidement.""",
        max_tokens=2000,
    )
    return {"ideas": ideas}


def _idea_dict(i):
    return {
        "id": i.id, "title": i.title, "platform": i.platform,
        "content_type": i.content_type, "brief": i.brief,
        "generated_body": i.generated_body, "ai_score": i.ai_score,
        "status": i.status,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  MODULE D — AUTOMATISATION & OPTIMISATION
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/opportunities")
def list_opportunities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    opps = db.query(Opportunity).filter_by(user_id=current_user.id).order_by(Opportunity.score.desc()).all()
    return [_opp_dict(o) for o in opps]


@router.post("/opportunities")
def create_opportunity(data: OpportunityCreate,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    o = Opportunity(
        title=data.title,
        niche=data.niche,
        platform=data.platform,
        notes=data.notes,
        score=_auto_score(),
        revenue_estimate=random.randint(100, 5000),
        priority="medium",
        status="new",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(o)
    db.commit()
    db.refresh(o)
    return _opp_dict(o)


@router.delete("/opportunities/{opp_id}")
def delete_opportunity(opp_id: int, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    o = db.query(Opportunity).filter_by(id=opp_id, user_id=current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Opportunité introuvable")
    db.delete(o)
    db.commit()
    return {"status": "deleted"}


@router.post("/opportunities/ai-scan")
def ai_scan_opportunities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Scanne et détecte les meilleures opportunités business avec l'IA."""
    client = get_client()
    rev_ctx = build_revenue_context(db, current_user.id)

    analysis = _groq_ask(
        client,
        system=f"Tu es un consultant expert en monétisation digitale et machine à cash.\nAnalyse les données et identifie les opportunités business les plus rentables IMMÉDIATEMENT.\n{rev_ctx}",
        user="""Scanne et identifie les 5 meilleures opportunités de revenus disponibles MAINTENANT.

Pour chaque opportunité, structure ta réponse ainsi :

🎯 [TITRE DE L'OPPORTUNITÉ]
Niche: [domaine]
Plateforme: [où agir]
Revenu estimé: [X€/mois]
Score priorité: [1-10]
Action immédiate: [quoi faire en premier — 1 phrase concrète]
Pourquoi maintenant: [2 phrases max]

---

Base ton analyse sur les données de revenus existantes et les tendances actuelles du marché digital.""",
        max_tokens=2000,
    )

    db.add(AIInsight(
        type="opportunities_scan",
        title=f"Scan opportunités — {datetime.utcnow().strftime('%Y-%m-%d')}",
        content=analysis,
        user_id=current_user.id,
    ))
    db.commit()

    return {"opportunities": analysis}


@router.post("/automation/optimize")
def ai_optimize_strategy(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Génère un plan d'optimisation automatique des revenus."""
    client = get_client()
    rev_ctx = build_revenue_context(db, current_user.id)

    trends_count = db.query(TrendAnalysis).filter_by(status="active", user_id=current_user.id).count()
    experiments  = db.query(ABExperiment).filter_by(status="running", user_id=current_user.id).count()
    ideas_count  = db.query(ContentIdea).filter_by(status="draft", user_id=current_user.id).count()

    plan = _groq_ask(
        client,
        system=f"Tu es CRÉA-IA, la machine à cash. Tu optimises en continu pour maximiser les revenus.\n{rev_ctx}\nPlateau Studio: {trends_count} tendances actives, {experiments} expériences en cours, {ideas_count} idées en draft.",
        user="""Génère un plan d'optimisation complet avec :

## 🚀 ACTIONS PRIORITAIRES (Cette semaine)
[3 actions concrètes avec impact estimé]

## 📈 STRATÉGIE D'AUTOMATISATION
[Comment automatiser la création de contenu]

## 💰 MACHINE À CASH — TOP 3 LEVIERS
[Les 3 leviers qui maximiseront les revenus le plus rapidement]

## ⚡ QUICK WINS (24-48h)
[Ce que tu peux faire immédiatement pour générer du revenu]

## 📊 MÉTRIQUES À SURVEILLER
[Quoi mesurer pour savoir si ça fonctionne]""",
        max_tokens=2000,
    )

    db.add(AIInsight(
        type="optimization_plan",
        title=f"Plan optimisation — {datetime.utcnow().strftime('%Y-%m-%d')}",
        content=plan,
        user_id=current_user.id,
    ))
    db.commit()

    return {"plan": plan}


@router.get("/studio-stats")
def get_studio_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stats globales du Plateau Studio."""
    uid = current_user.id
    trends    = db.query(TrendAnalysis).filter_by(user_id=uid).all()
    exps      = db.query(ABExperiment).filter_by(user_id=uid).all()
    ideas     = db.query(ContentIdea).filter_by(user_id=uid).all()
    opps      = db.query(Opportunity).filter_by(user_id=uid).all()

    best_trend = max(trends, key=lambda t: t.score, default=None)
    best_opp   = max(opps,   key=lambda o: o.score, default=None)

    return {
        "trends":      {"total": len(trends),  "active":    sum(1 for t in trends if t.status == "active"),    "avg_score": round(sum(t.score for t in trends) / len(trends), 1) if trends else 0},
        "experiments": {"total": len(exps),    "running":   sum(1 for e in exps if e.status == "running"),     "completed": sum(1 for e in exps if e.status == "completed")},
        "ideas":       {"total": len(ideas),   "generated": sum(1 for i in ideas if i.status == "generated"),  "drafts":    sum(1 for i in ideas if i.status == "draft")},
        "opportunities":{"total": len(opps),   "new":       sum(1 for o in opps if o.status == "new"),         "total_revenue_potential": sum(o.revenue_estimate for o in opps)},
        "best_trend":  {"niche": best_trend.niche, "score": best_trend.score} if best_trend else None,
        "best_opportunity": {"title": best_opp.title, "revenue": best_opp.revenue_estimate} if best_opp else None,
    }


# ── Publication plateformes ───────────────────────────────────────────────────

@router.post("/publish/youtube")
async def publish_youtube(
    file: UploadFile = File(...),
    title: str = Form("Vidéo CRÉA-ACTION"),
    description: str = Form("Généré avec CRÉA-ACTION"),
    privacy: str = Form("public"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(YouTubeAccount).filter_by(user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte YouTube non connecté. Connecte YouTube depuis la sidebar.")

    video_data = await file.read()
    headers = {"Authorization": f"Bearer {account.access_token}"}

    # Initier un upload resumable
    metadata = {
        "snippet": {"title": title, "description": description, "categoryId": "22"},
        "status": {"privacyStatus": privacy},
    }
    init_resp = httpx.post(
        "https://www.googleapis.com/upload/youtube/v3/videos",
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={**headers, "Content-Type": "application/json", "X-Upload-Content-Type": "video/webm"},
        json=metadata,
        timeout=30,
    )
    if init_resp.status_code not in (200, 201):
        detail = init_resp.json().get("error", {}).get("message", init_resp.text)
        raise HTTPException(status_code=400, detail=f"Erreur YouTube: {detail}")

    upload_url = init_resp.headers.get("Location")
    if not upload_url:
        raise HTTPException(status_code=500, detail="URL d'upload YouTube manquante")

    # Upload du fichier vidéo
    upload_resp = httpx.put(
        upload_url,
        content=video_data,
        headers={"Content-Type": "video/webm", "Content-Length": str(len(video_data))},
        timeout=300,
    )
    if upload_resp.status_code not in (200, 201):
        detail = upload_resp.json().get("error", {}).get("message", upload_resp.text)
        raise HTTPException(status_code=400, detail=f"Upload échoué: {detail}")

    video_id = upload_resp.json().get("id", "")
    return {"status": "published", "video_id": video_id, "url": f"https://youtu.be/{video_id}"}


# ── Génération d'idée vidéo IA ────────────────────────────────────────────────

class AIVideoIdeaRequest(BaseModel):
    niche: str = ""
    platform: str = "YouTube"


@router.post("/ai-video-idea")
def ai_video_idea(request: AIVideoIdeaRequest,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Génère un concept de vidéo viral avec Claude pour maximiser vues et revenus."""
    client = get_client()
    niche = request.niche or "motivation, business digital, astuces créateur"

    raw = _groq_ask(
        client,
        system=f"Tu es un expert en contenu viral sur {request.platform}. Réponds UNIQUEMENT en JSON valide.",
        user=f"""Génère une idée de vidéo courte (30-60s) très susceptible d'être vue massivement.

Niche: {niche}

Réponds UNIQUEMENT en JSON valide (aucun texte avant ni après):
{{
  "title": "TITRE EN MAJUSCULES MAX 45 CHARS",
  "theme": "cyberpunk",
  "sound": "electronic",
  "description": "Description YouTube 2-3 phrases SEO optimisé avec mots-clés",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "hook": "Accroche courte affichée dans la vidéo (max 38 chars)",
  "key_points": ["Point 1 très court", "Point 2 très court", "Point 3 très court"]
}}

Règles: theme doit être parmi cyberpunk/lofi/fire/nature/minimal/goldRush/ocean/synthwave/bloodMoon/arctic/matrix, sound parmi lofi/electronic/hiphop/ambient.
Les key_points sont des conseils/faits impactants max 28 chars chacun.""",
        max_tokens=600,
    )
    import json, re
    try:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            data = json.loads(m.group())
            if data.get("theme") not in {"cyberpunk", "lofi", "fire", "nature", "minimal", "goldRush", "ocean", "synthwave", "bloodMoon", "arctic", "matrix"}:
                data["theme"] = "cyberpunk"
            if data.get("sound") not in {"lofi", "electronic", "hiphop", "ambient"}:
                data["sound"] = "electronic"
            return data
    except Exception:
        pass

    return {
        "title": "CRÉEZ DU CONTENU VIRAL",
        "theme": "cyberpunk",
        "sound": "electronic",
        "description": "Contenu généré avec CRÉA-ACTION — Dashboard créateurs pour maximiser vos revenus.",
        "tags": ["contenu", "viral", "createur", "youtube", "revenus"],
        "hook": "1 astuce pour 10x tes vues",
        "key_points": ["Publie chaque jour", "Soigne l'accroche", "Appel à l'action"],
    }


# ── Utilitaire ────────────────────────────────────────────────────────────────

def _auto_score():
    return random.randint(55, 95)


def _opp_dict(o):
    return {
        "id": o.id, "title": o.title, "niche": o.niche,
        "platform": o.platform, "notes": o.notes,
        "score": o.score, "revenue_estimate": o.revenue_estimate,
        "priority": o.priority, "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }
