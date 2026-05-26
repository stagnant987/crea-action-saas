"""Dashboard — agrégation de toutes les sources de revenus."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import (
    YouTubeAccount, InstagramAccount, FacebookPage, TikTokAccount,
    SnapchatAccount, PinterestAccount, TwitchAccount, TwitterAccount,
    LinkedInAccount, SpotifyAccount, PatreonAccount, SubstackNewsletter,
    DiscordServer, DigitalProduct, RevenueHistory, Goal, User
)
from routers.auth_users import get_current_user

router = APIRouter()


@router.get("/summary")
def get_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.id
    yt   = db.query(YouTubeAccount).filter_by(user_id=uid).all()
    ig   = db.query(InstagramAccount).filter_by(user_id=uid).all()
    fb   = db.query(FacebookPage).filter_by(user_id=uid).all()
    tt   = db.query(TikTokAccount).filter_by(user_id=uid).all()
    sc   = db.query(SnapchatAccount).filter_by(user_id=uid).all()
    pin  = db.query(PinterestAccount).filter_by(user_id=uid).all()
    twi  = db.query(TwitchAccount).filter_by(user_id=uid).all()
    tw   = db.query(TwitterAccount).filter_by(user_id=uid).all()
    li   = db.query(LinkedInAccount).filter_by(user_id=uid).all()
    sp   = db.query(SpotifyAccount).filter_by(user_id=uid).all()
    pat  = db.query(PatreonAccount).filter_by(user_id=uid).all()
    sub  = db.query(SubstackNewsletter).filter_by(user_id=uid).all()
    dis  = db.query(DiscordServer).filter_by(user_id=uid).all()
    prod = db.query(DigitalProduct).filter_by(user_id=uid).all()

    yt_rev   = sum(a.estimated_revenue for a in yt)
    ig_rev   = sum(a.manual_revenue for a in ig)
    tt_rev   = sum(a.manual_revenue for a in tt)
    sc_rev   = sum(a.ad_revenue for a in sc)
    pin_rev  = sum(a.ad_revenue for a in pin)
    twi_rev  = sum(a.manual_revenue for a in twi)
    tw_rev   = sum(a.manual_revenue for a in tw)
    pat_rev  = sum(a.monthly_revenue for a in pat)
    sub_rev  = sum(a.monthly_revenue for a in sub)
    dis_rev  = sum(a.monthly_revenue for a in dis)
    prod_rev = sum(p.monthly_revenue for p in prod)

    total = yt_rev + ig_rev + tt_rev + sc_rev + pin_rev + twi_rev + tw_rev + pat_rev + sub_rev + dis_rev + prod_rev

    return {
        "total_revenue": round(total, 2),
        "youtube":    {"revenue": round(yt_rev, 2),  "subscribers": sum(a.subscribers for a in yt),  "total_views": sum(a.total_views for a in yt),   "accounts": len(yt)},
        "instagram":  {"revenue": round(ig_rev, 2),  "followers": sum(a.followers for a in ig),       "impressions": sum(a.impressions for a in ig),    "accounts": len(ig)},
        "facebook":   {"followers": sum(p.followers for p in fb),  "reach": sum(p.reach for p in fb), "pages": len(fb)},
        "tiktok":     {"revenue": round(tt_rev, 2),  "followers": sum(a.followers for a in tt),       "total_views": sum(a.total_views for a in tt),    "accounts": len(tt)},
        "snapchat":   {"revenue": round(sc_rev, 2),  "followers": sum(a.followers for a in sc),       "story_views": sum(a.story_views for a in sc),    "accounts": len(sc)},
        "pinterest":  {"revenue": round(pin_rev, 2), "followers": sum(a.followers for a in pin),      "impressions": sum(a.impressions for a in pin),   "accounts": len(pin)},
        "twitch":     {"revenue": round(twi_rev, 2), "followers": sum(a.followers for a in twi),      "avg_viewers": sum(a.avg_viewers for a in twi),   "accounts": len(twi)},
        "twitter":    {"revenue": round(tw_rev, 2),  "followers": sum(a.followers for a in tw),       "impressions": sum(a.impressions for a in tw),    "accounts": len(tw)},
        "linkedin":   {"followers": sum(a.followers for a in li),  "impressions": sum(a.impressions for a in li), "accounts": len(li)},
        "spotify":    {"followers": sum(a.followers for a in sp),  "monthly_listeners": sum(a.monthly_listeners for a in sp), "accounts": len(sp)},
        "patreon":    {"revenue": round(pat_rev, 2), "patron_count": sum(a.patron_count for a in pat), "accounts": len(pat)},
        "substack":   {"revenue": round(sub_rev, 2), "paid_subscribers": sum(a.paid_subscribers for a in sub), "free_subscribers": sum(a.free_subscribers for a in sub), "count": len(sub)},
        "discord":    {"revenue": round(dis_rev, 2), "members": sum(a.member_count for a in dis),     "premium": sum(a.premium_members for a in dis),  "count": len(dis)},
        "products":   {"revenue": round(prod_rev, 2), "count": len(prod)},
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.get("/history")
def get_history(current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db), limit: int = 12):
    history = (db.query(RevenueHistory)
               .filter_by(user_id=current_user.id)
               .order_by(RevenueHistory.month.desc())
               .limit(limit).all())
    history.reverse()
    return [{"month": h.month, "youtube": h.youtube, "instagram": h.instagram, "tiktok": h.tiktok,
             "snapchat": h.snapchat, "twitch": h.twitch, "twitter": h.twitter, "patreon": h.patreon,
             "products": h.products, "total": h.total} for h in history]


@router.post("/history/snapshot")
def save_snapshot(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.id
    month = datetime.utcnow().strftime("%Y-%m")
    yt_rev  = sum(a.estimated_revenue for a in db.query(YouTubeAccount).filter_by(user_id=uid).all())
    ig_rev  = sum(a.manual_revenue    for a in db.query(InstagramAccount).filter_by(user_id=uid).all())
    tt_rev  = sum(a.manual_revenue    for a in db.query(TikTokAccount).filter_by(user_id=uid).all())
    sc_rev  = sum(a.ad_revenue        for a in db.query(SnapchatAccount).filter_by(user_id=uid).all())
    pin_rev = sum(a.ad_revenue        for a in db.query(PinterestAccount).filter_by(user_id=uid).all())
    twi_rev = sum(a.manual_revenue    for a in db.query(TwitchAccount).filter_by(user_id=uid).all())
    tw_rev  = sum(a.manual_revenue    for a in db.query(TwitterAccount).filter_by(user_id=uid).all())
    pat_rev = sum(a.monthly_revenue   for a in db.query(PatreonAccount).filter_by(user_id=uid).all())
    sub_rev = sum(a.monthly_revenue   for a in db.query(SubstackNewsletter).filter_by(user_id=uid).all())
    dis_rev = sum(a.monthly_revenue   for a in db.query(DiscordServer).filter_by(user_id=uid).all())
    prod_rev= sum(p.monthly_revenue   for p in db.query(DigitalProduct).filter_by(user_id=uid).all())
    total   = yt_rev + ig_rev + tt_rev + sc_rev + pin_rev + twi_rev + tw_rev + pat_rev + sub_rev + dis_rev + prod_rev

    snap = db.query(RevenueHistory).filter_by(month=month, user_id=uid).first()
    if not snap:
        snap = RevenueHistory(month=month, user_id=uid)
        db.add(snap)
    snap.youtube = round(yt_rev, 2); snap.instagram = round(ig_rev, 2)
    snap.tiktok = round(tt_rev, 2);  snap.snapchat = round(sc_rev, 2)
    snap.twitch = round(twi_rev, 2); snap.twitter = round(tw_rev, 2)
    snap.patreon = round(pat_rev, 2); snap.products = round(prod_rev, 2)
    snap.total = round(total, 2); snap.created_at = datetime.utcnow()
    db.commit()
    return {"status": "ok", "month": month, "total": total}


@router.post("/sync-goals")
def sync_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Synchronise les objectifs avec le revenu total actuel et auto-snapshot mensuel."""
    uid = current_user.id
    month = datetime.utcnow().strftime("%Y-%m")

    # Calcul du revenu total
    yt_rev  = sum(a.estimated_revenue for a in db.query(YouTubeAccount).filter_by(user_id=uid).all())
    ig_rev  = sum(a.manual_revenue    for a in db.query(InstagramAccount).filter_by(user_id=uid).all())
    tt_rev  = sum(a.manual_revenue    for a in db.query(TikTokAccount).filter_by(user_id=uid).all())
    sc_rev  = sum(a.ad_revenue        for a in db.query(SnapchatAccount).filter_by(user_id=uid).all())
    pin_rev = sum(a.ad_revenue        for a in db.query(PinterestAccount).filter_by(user_id=uid).all())
    twi_rev = sum(a.manual_revenue    for a in db.query(TwitchAccount).filter_by(user_id=uid).all())
    tw_rev  = sum(a.manual_revenue    for a in db.query(TwitterAccount).filter_by(user_id=uid).all())
    pat_rev = sum(a.monthly_revenue   for a in db.query(PatreonAccount).filter_by(user_id=uid).all())
    sub_rev = sum(a.monthly_revenue   for a in db.query(SubstackNewsletter).filter_by(user_id=uid).all())
    dis_rev = sum(a.monthly_revenue   for a in db.query(DiscordServer).filter_by(user_id=uid).all())
    prod_rev= sum(p.monthly_revenue   for p in db.query(DigitalProduct).filter_by(user_id=uid).all())
    total   = round(yt_rev + ig_rev + tt_rev + sc_rev + pin_rev + twi_rev + tw_rev + pat_rev + sub_rev + dis_rev + prod_rev, 2)

    # Auto-snapshot mensuel si absent
    if not db.query(RevenueHistory).filter_by(month=month, user_id=uid).first():
        snap = RevenueHistory(month=month, user_id=uid,
            youtube=round(yt_rev,2), instagram=round(ig_rev,2), tiktok=round(tt_rev,2),
            snapchat=round(sc_rev,2), twitch=round(twi_rev,2), twitter=round(tw_rev,2),
            patreon=round(pat_rev,2), products=round(prod_rev,2), total=total,
            created_at=datetime.utcnow())
        db.add(snap)

    # Mise à jour des objectifs
    goals = db.query(Goal).filter_by(user_id=uid).all()
    result = []
    for g in goals:
        was_achieved = g.current_amount >= g.target_amount and g.target_amount > 0
        g.current_amount = total
        newly_achieved = (not was_achieved) and total >= g.target_amount and g.target_amount > 0
        pct = round(total / g.target_amount * 100, 1) if g.target_amount else 0
        result.append({
            "id": g.id, "title": g.title,
            "target_amount": g.target_amount,
            "current_amount": total,
            "progress_pct": pct,
            "achieved": total >= g.target_amount and g.target_amount > 0,
            "newly_achieved": newly_achieved,
            "deadline": g.deadline,
        })

    db.commit()
    return {"total_revenue": total, "month": month, "goals": result}
