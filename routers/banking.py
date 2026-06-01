"""
Gestion des comptes bancaires, transactions et import CSV.
"""
import io
import csv
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import BankAccount, Transaction, User
from routers.auth_users import get_current_user

router = APIRouter()


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class BankAccountCreate(BaseModel):
    name: str
    current_balance: float = 0.0
    currency: str = "EUR"


class BankAccountUpdate(BaseModel):
    current_balance: float


class TransactionCreate(BaseModel):
    bank_account_id: int
    date: str          # ISO format "2025-01-15"
    description: str
    amount: float
    category: str = "Autre"


# ── Catégorisation automatique simple ────────────────────────────────────────

CATEGORY_RULES = {
    "youtube": ["youtube", "google adsense", "adsense"],
    "spotify": ["spotify"],
    "tiktok": ["tiktok", "bytedance"],
    "instagram": ["instagram", "meta"],
    "abonnement": ["netflix", "abonnement", "subscription"],
    "logement": ["loyer", "electricite", "gaz", "eau", "edf"],
    "transport": ["sncf", "ratp", "uber", "blablacar"],
    "alimentation": ["carrefour", "leclerc", "lidl", "monoprix", "aldi"],
    "revenu freelance": ["freelance", "mission", "prestation", "client"],
    "produits numériques": ["gumroad", "lemon squeezy", "lemonsqueezy", "stripe"],
}


def auto_categorize(description: str) -> str:
    desc_lower = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(kw in desc_lower for kw in keywords):
            return category.title()
    return "Autre"


# ── Comptes bancaires ─────────────────────────────────────────────────────────

@router.get("/accounts")
def list_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": a.id, "name": a.name,
            "current_balance": a.current_balance,
            "currency": a.currency,
            "last_updated": a.last_updated.isoformat() if a.last_updated else None,
            "transaction_count": len(a.transactions),
        }
        for a in accounts
    ]


@router.post("/accounts")
def create_account(data: BankAccountCreate, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    account = BankAccount(
        name=data.name,
        current_balance=data.current_balance,
        currency=data.currency,
        user_id=current_user.id,
        last_updated=datetime.utcnow(),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return {"id": account.id, "name": account.name, "status": "created"}


@router.put("/accounts/{account_id}")
def update_balance(account_id: int, data: BankAccountUpdate,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    account.current_balance = data.current_balance
    account.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "ok", "current_balance": account.current_balance}


@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    db.delete(account)
    db.commit()
    return {"status": "deleted"}


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions")
def list_transactions(
    account_id: Optional[int] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Récupère les IDs des comptes appartenant à l'utilisateur
    user_account_ids = [
        a.id for a in db.query(BankAccount).filter_by(user_id=current_user.id).all()
    ]
    q = db.query(Transaction).filter(Transaction.bank_account_id.in_(user_account_ids))
    if account_id:
        if account_id not in user_account_ids:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        q = q.filter(Transaction.bank_account_id == account_id)
    transactions = q.order_by(Transaction.date.desc()).limit(limit).all()
    return [
        {
            "id": t.id, "bank_account_id": t.bank_account_id,
            "date": t.date.isoformat() if t.date else None,
            "description": t.description, "amount": t.amount,
            "category": t.category,
        }
        for t in transactions
    ]


@router.post("/transactions")
def create_transaction(data: TransactionCreate, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter_by(id=data.bank_account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    category = data.category if data.category != "Autre" else auto_categorize(data.description)
    t = Transaction(
        bank_account_id=data.bank_account_id,
        date=date.fromisoformat(data.date),
        description=data.description,
        amount=data.amount,
        category=category,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "category": t.category, "status": "created"}


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    t = db.query(Transaction).filter_by(id=transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    # Vérifier que la transaction appartient à un compte de l'utilisateur
    account = db.query(BankAccount).filter_by(id=t.bank_account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    db.delete(t)
    db.commit()
    return {"status": "deleted"}


# ── Import CSV ────────────────────────────────────────────────────────────────

@router.post("/import-csv/{account_id}")
async def import_csv(account_id: int, file: UploadFile = File(...),
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """
    Importe un relevé bancaire CSV.
    Colonnes acceptées (auto-détectées) :
      date | libelle/description/label | montant/amount/credit/debit
    """
    account = db.query(BankAccount).filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")

    # Auto-détection du séparateur
    sample = text[:500]
    sep = ";" if sample.count(";") > sample.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]

    # Mapping colonnes
    date_col = next((h for h in headers if "date" in h), None)
    desc_col = next(
        (h for h in headers if any(k in h for k in ["libelle", "label", "description", "motif"])),
        None,
    )
    amount_col = next(
        (h for h in headers if any(k in h for k in ["montant", "amount", "valeur", "solde"])),
        None,
    )

    if not all([date_col, desc_col, amount_col]):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Colonnes non reconnues : {headers}. "
                "Le CSV doit contenir des colonnes date, libellé et montant."
            ),
        )

    imported = 0
    errors = 0

    for row in reader:
        try:
            raw_date = row[date_col].strip()
            # Essaie plusieurs formats
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
                try:
                    parsed_date = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            else:
                errors += 1
                continue

            raw_amount = row[amount_col].strip().replace(",", ".").replace(" ", "").replace("\xa0", "")
            amount = float(raw_amount)
            description = row[desc_col].strip()
            category = auto_categorize(description)

            t = Transaction(
                bank_account_id=account_id,
                date=parsed_date,
                description=description,
                amount=amount,
                category=category,
            )
            db.add(t)
            imported += 1
        except Exception:
            errors += 1

    db.commit()
    return {
        "status": "ok",
        "imported": imported,
        "errors": errors,
        "message": f"{imported} transactions importées, {errors} ignorées.",
    }
