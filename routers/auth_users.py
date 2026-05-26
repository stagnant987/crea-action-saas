"""Authentification utilisateur — JWT + bcrypt."""
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config
from database import get_db
from models import User

# ── Rate limiting simple (en mémoire) ────────────────────────────────────────
_attempts: dict = defaultdict(list)  # ip → [timestamps]
_MAX_ATTEMPTS = 10
_WINDOW_SECONDS = 60

def _check_rate_limit(request: Request):
    ip = request.client.host
    now = time.time()
    _attempts[ip] = [t for t in _attempts[ip] if now - t < _WINDOW_SECONDS]
    if len(_attempts[ip]) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Trop de tentatives. Réessayez dans {_WINDOW_SECONDS} secondes."
        )
    _attempts[ip].append(now)

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/token")

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 jours


# ── Helpers ───────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm="HS256")


def get_user_from_token_str(token: str, db: Session) -> User:
    """Valide un token JWT brut et retourne l'utilisateur."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expirée ou invalide. Reconnectez-vous.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expirée ou invalide. Reconnectez-vous.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None


# ── Schémas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ResetPasswordRequest(BaseModel):
    username: str
    email: str
    new_password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/token", response_model=TokenResponse)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    _check_rate_limit(request)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}


@router.post("/register", response_model=TokenResponse)
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Identifiant trop court (min 3 caractères).")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6 caractères).")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=409, detail="Cet identifiant est déjà utilisé.")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé.")
    user = User(username=req.username, email=req.email, hashed_password=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "created_at": current_user.created_at.isoformat()}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nouveau mot de passe trop court (min 6 caractères).")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"status": "ok", "message": "Mot de passe mis à jour."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Identifiant introuvable.")
    if not user.email or user.email.lower() != req.email.lower():
        raise HTTPException(status_code=403, detail="Email incorrect pour cet identifiant.")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6 caractères).")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"status": "ok", "message": "Mot de passe réinitialisé."}


@router.get("/has-users")
def has_users(db: Session = Depends(get_db)):
    """Vérifie si des utilisateurs existent (pour afficher register ou login)."""
    count = db.query(User).count()
    return {"has_users": count > 0}
