"""Configuration centralisée via variables d'environnement."""
import os
from dotenv import load_dotenv

load_dotenv()

APP_URL = os.getenv("APP_URL", "http://localhost:8000")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")

# ── IA Anthropic ──────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL   = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# ── IA Groq (gratuit) ─────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── Google / YouTube ──────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = f"{APP_URL}/auth/youtube/callback"
GOOGLE_AUTH_URL      = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL     = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# ── Meta (Instagram + Facebook) ───────────────────────────────────────────────
META_APP_ID      = os.getenv("META_APP_ID", "")
META_APP_SECRET  = os.getenv("META_APP_SECRET", "")
META_REDIRECT_URI = f"{APP_URL}/auth/meta/callback"
META_AUTH_URL    = "https://www.facebook.com/v18.0/dialog/oauth"
META_TOKEN_URL   = "https://graph.facebook.com/v18.0/oauth/access_token"
META_SCOPES = ["instagram_basic", "instagram_manage_insights", "instagram_content_publish",
               "pages_show_list", "pages_read_engagement", "ads_read", "public_profile"]

# ── TikTok ────────────────────────────────────────────────────────────────────
TIKTOK_CLIENT_KEY    = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")
TIKTOK_REDIRECT_URI  = f"{APP_URL}/auth/tiktok/callback"
TIKTOK_AUTH_URL      = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL     = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_SCOPES        = ["user.info.basic", "user.info.stats", "video.upload", "video.publish"]

# ── Snapchat ──────────────────────────────────────────────────────────────────
SNAPCHAT_CLIENT_ID     = os.getenv("SNAPCHAT_CLIENT_ID", "")
SNAPCHAT_CLIENT_SECRET = os.getenv("SNAPCHAT_CLIENT_SECRET", "")
SNAPCHAT_REDIRECT_URI  = f"{APP_URL}/auth/snapchat/callback"
SNAPCHAT_AUTH_URL      = "https://accounts.snapchat.com/accounts/oauth2/auth"
SNAPCHAT_TOKEN_URL     = "https://accounts.snapchat.com/accounts/oauth2/token"
SNAPCHAT_SCOPES        = ["https://auth.snapchat.com/oauth2/api/user.display_name",
                           "https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar"]

# ── Pinterest ─────────────────────────────────────────────────────────────────
PINTEREST_APP_ID     = os.getenv("PINTEREST_APP_ID", "")
PINTEREST_APP_SECRET = os.getenv("PINTEREST_APP_SECRET", "")
PINTEREST_REDIRECT_URI = f"{APP_URL}/auth/pinterest/callback"
PINTEREST_AUTH_URL   = "https://www.pinterest.com/oauth/"
PINTEREST_TOKEN_URL  = "https://api.pinterest.com/v5/oauth/token"
PINTEREST_SCOPES     = ["boards:read", "pins:read", "user_accounts:read",
                         "user_accounts:read_ads"]

# ── Twitch ────────────────────────────────────────────────────────────────────
TWITCH_CLIENT_ID     = os.getenv("TWITCH_CLIENT_ID", "")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET", "")
TWITCH_REDIRECT_URI  = f"{APP_URL}/auth/twitch/callback"
TWITCH_AUTH_URL      = "https://id.twitch.tv/oauth2/authorize"
TWITCH_TOKEN_URL     = "https://id.twitch.tv/oauth2/token"
TWITCH_SCOPES        = ["channel:read:subscriptions", "bits:read",
                         "channel:read:redemptions", "user:read:email"]

# ── Twitter / X ───────────────────────────────────────────────────────────────
TWITTER_CLIENT_ID     = os.getenv("TWITTER_CLIENT_ID", "")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET", "")
TWITTER_REDIRECT_URI  = f"{APP_URL}/auth/twitter/callback"
TWITTER_AUTH_URL      = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN_URL     = "https://api.twitter.com/2/oauth2/token"
TWITTER_SCOPES        = ["tweet.read", "users.read", "offline.access"]

# ── LinkedIn ──────────────────────────────────────────────────────────────────
LINKEDIN_CLIENT_ID     = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_REDIRECT_URI  = f"{APP_URL}/auth/linkedin/callback"
LINKEDIN_AUTH_URL      = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL     = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_SCOPES        = ["r_liteprofile", "r_emailaddress", "r_organization_social"]

# ── Spotify ───────────────────────────────────────────────────────────────────
SPOTIFY_CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI  = f"{APP_URL}/auth/spotify/callback"
SPOTIFY_AUTH_URL      = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL     = "https://accounts.spotify.com/api/token"
SPOTIFY_SCOPES        = ["user-read-private", "user-read-email",
                          "user-top-read", "user-read-recently-played"]

# ── Patreon ───────────────────────────────────────────────────────────────────
PATREON_CLIENT_ID     = os.getenv("PATREON_CLIENT_ID", "")
PATREON_CLIENT_SECRET = os.getenv("PATREON_CLIENT_SECRET", "")
PATREON_REDIRECT_URI  = f"{APP_URL}/auth/patreon/callback"
PATREON_AUTH_URL      = "https://www.patreon.com/oauth2/authorize"
PATREON_TOKEN_URL     = "https://www.patreon.com/api/oauth2/token"
PATREON_SCOPES        = ["identity", "campaigns", "campaigns.members",
                          "campaigns.posts"]

# ── Gumroad / Lemon Squeezy ───────────────────────────────────────────────────
GUMROAD_API_KEY       = os.getenv("GUMROAD_API_KEY", "")
LEMON_SQUEEZY_API_KEY = os.getenv("LEMON_SQUEEZY_API_KEY", "")
