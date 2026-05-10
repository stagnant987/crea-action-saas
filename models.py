"""Modèles SQLAlchemy — toutes les tables de l'application."""
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


# ══════════════════════════════════════════════════════
#  UTILISATEURS
# ══════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  PLATEFORMES ORIGINALES
# ══════════════════════════════════════════════════════

class YouTubeAccount(Base):
    __tablename__ = "youtube_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    channel_id = Column(String, index=True)
    channel_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    token_expiry = Column(DateTime, nullable=True)
    subscribers = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    monthly_views = Column(Integer, default=0)
    estimated_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class InstagramAccount(Base):
    __tablename__ = "instagram_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, index=True)
    username = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class FacebookPage(Base):
    __tablename__ = "facebook_pages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    page_id = Column(String, index=True)
    page_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    ad_clicks = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class TikTokAccount(Base):
    __tablename__ = "tiktok_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    open_id = Column(String, index=True)
    username = Column(String, default="")
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  NOUVELLES PLATEFORMES
# ══════════════════════════════════════════════════════

class SnapchatAccount(Base):
    __tablename__ = "snapchat_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, index=True)
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    story_views = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    ad_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class PinterestAccount(Base):
    __tablename__ = "pinterest_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, index=True)
    username = Column(String, default="")
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    ad_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class TwitchAccount(Base):
    __tablename__ = "twitch_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_id_twitch = Column(String, index=True)
    username = Column(String, default="")
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    avg_viewers = Column(Integer, default=0)
    bits_revenue = Column(Float, default=0.0)
    sub_revenue = Column(Float, default=0.0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class TwitterAccount(Base):
    __tablename__ = "twitter_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    twitter_user_id = Column(String, index=True)
    username = Column(String, default="")
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class LinkedInAccount(Base):
    __tablename__ = "linkedin_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, index=True)
    name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class SpotifyAccount(Base):
    __tablename__ = "spotify_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    spotify_id = Column(String, index=True)
    display_name = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    followers = Column(Integer, default=0)
    monthly_listeners = Column(Integer, default=0)
    streams = Column(Integer, default=0)
    manual_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class PatreonAccount(Base):
    __tablename__ = "patreon_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patreon_id = Column(String, index=True)
    username = Column(String, default="")
    avatar_url = Column(String, default="")
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    patron_count = Column(Integer, default=0)
    monthly_revenue = Column(Float, default=0.0)
    new_patrons_month = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class SubstackNewsletter(Base):
    __tablename__ = "substack_newsletters"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, default="Ma Newsletter")
    url = Column(String, default="")
    free_subscribers = Column(Integer, default=0)
    paid_subscribers = Column(Integer, default=0)
    monthly_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class DiscordServer(Base):
    __tablename__ = "discord_servers"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, default="Mon Serveur")
    invite_url = Column(String, default="")
    member_count = Column(Integer, default=0)
    premium_members = Column(Integer, default=0)
    monthly_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class CustomPlatform(Base):
    __tablename__ = "custom_platforms"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, default="")
    platform_type = Column(String, default="")
    url = Column(String, default="")
    monthly_revenue = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  FINANCES
# ══════════════════════════════════════════════════════

class BankAccount(Base):
    __tablename__ = "bank_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String)
    current_balance = Column(Float, default=0.0)
    currency = Column(String, default="EUR")
    last_updated = Column(DateTime, default=datetime.utcnow)
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"))
    date = Column(Date, default=date.today)
    description = Column(String, default="")
    amount = Column(Float, default=0.0)
    category = Column(String, default="Autre")
    account = relationship("BankAccount", back_populates="transactions")


class DigitalProduct(Base):
    __tablename__ = "digital_products"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform = Column(String, default="manual")
    api_key = Column(String, nullable=True)
    product_name = Column(String)
    monthly_revenue = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  CONTENU
# ══════════════════════════════════════════════════════

class ContentTodo(Base):
    __tablename__ = "content_todos"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String)
    platform = Column(String, default="general")
    status = Column(String, default="todo")
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String)
    target_amount = Column(Float, default=0.0)
    current_amount = Column(Float, default=0.0)
    deadline = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RevenueHistory(Base):
    __tablename__ = "revenue_history"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    month = Column(String)
    youtube = Column(Float, default=0.0)
    instagram = Column(Float, default=0.0)
    facebook = Column(Float, default=0.0)
    tiktok = Column(Float, default=0.0)
    snapchat = Column(Float, default=0.0)
    twitch = Column(Float, default=0.0)
    twitter = Column(Float, default=0.0)
    patreon = Column(Float, default=0.0)
    products = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  IA
# ══════════════════════════════════════════════════════

class AIConversation(Base):
    __tablename__ = "ai_conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIInsight(Base):
    __tablename__ = "ai_insights"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String)
    title = Column(String, default="")
    content = Column(Text)
    month = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
#  PLATEAU STUDIO
# ══════════════════════════════════════════════════════

class TrendAnalysis(Base):
    __tablename__ = "trend_analyses"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    niche = Column(String, default="")
    platform = Column(String, default="")
    description = Column(Text, default="")
    score = Column(Integer, default=50)
    revenue_potential = Column(Integer, default=5)
    competition = Column(Integer, default=5)
    ease = Column(Integer, default=5)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)


class ContentIdea(Base):
    __tablename__ = "content_ideas"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="")
    platform = Column(String, default="")
    content_type = Column(String, default="post")
    brief = Column(Text, default="")
    generated_body = Column(Text, nullable=True)
    ai_score = Column(Integer, default=50)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)


class ABExperiment(Base):
    __tablename__ = "ab_experiments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="")
    hypothesis = Column(Text, default="")
    variant_a = Column(Text, default="")
    variant_b = Column(Text, default="")
    platform = Column(String, default="general")
    status = Column(String, default="running")
    winner = Column(String, nullable=True)
    insights = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Opportunity(Base):
    __tablename__ = "opportunities"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="")
    niche = Column(String, default="")
    platform = Column(String, default="")
    notes = Column(Text, default="")
    score = Column(Integer, default=50)
    revenue_estimate = Column(Float, default=0.0)
    priority = Column(String, default="medium")
    status = Column(String, default="new")
    created_at = Column(DateTime, default=datetime.utcnow)
