"""
To-do liste de contenu + Objectifs de revenus.
"""
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import ContentTodo, Goal, User
from routers.auth_users import get_current_user

router = APIRouter()


# ── Schémas ────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str
    target_amount: float = 0.0
    current_amount: float = 0.0
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    current_amount: Optional[float] = None
    title: Optional[str] = None
    target_amount: Optional[float] = None
    deadline: Optional[str] = None


class TodoCreate(BaseModel):
    title: str
    platform: str = "general"
    due_date: Optional[str] = None       # ISO "2025-03-15"


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None         # todo | in_progress | done
    due_date: Optional[str] = None


# ── Todos ─────────────────────────────────────────────────────────────────────

@router.get("/todos")
def list_todos(platform: Optional[str] = None, status: Optional[str] = None,
               current_user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    q = db.query(ContentTodo).filter(ContentTodo.user_id == current_user.id)
    if platform:
        q = q.filter(ContentTodo.platform == platform)
    if status:
        q = q.filter(ContentTodo.status == status)
    todos = q.order_by(ContentTodo.due_date.asc(), ContentTodo.created_at.asc()).all()
    return [
        {
            "id": t.id, "title": t.title, "platform": t.platform,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in todos
    ]


@router.post("/todos")
def create_todo(data: TodoCreate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    todo = ContentTodo(
        title=data.title,
        platform=data.platform,
        due_date=date.fromisoformat(data.due_date) if data.due_date else None,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return {"id": todo.id, "status": "created"}


@router.put("/todos/{todo_id}")
def update_todo(todo_id: int, data: TodoUpdate,
                current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    todo = db.query(ContentTodo).filter_by(id=todo_id, user_id=current_user.id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    if data.title is not None:
        todo.title = data.title
    if data.platform is not None:
        todo.platform = data.platform
    if data.status is not None:
        todo.status = data.status
    if data.due_date is not None:
        todo.due_date = date.fromisoformat(data.due_date)
    db.commit()
    return {"status": "updated"}


@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    todo = db.query(ContentTodo).filter_by(id=todo_id, user_id=current_user.id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    db.delete(todo)
    db.commit()
    return {"status": "deleted"}


# ── Objectifs ─────────────────────────────────────────────────────────────────

def _goal_dict(g: Goal) -> dict:
    pct = round((g.current_amount / g.target_amount * 100) if g.target_amount else 0, 1)
    return {
        "id": g.id, "title": g.title,
        "target_amount": g.target_amount, "current_amount": g.current_amount,
        "progress_pct": pct, "deadline": g.deadline,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


@router.get("/goals")
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(Goal).filter_by(user_id=current_user.id).order_by(Goal.created_at.desc()).all()
    return [_goal_dict(g) for g in goals]


@router.post("/goals")
def create_goal(data: GoalCreate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    goal = Goal(user_id=current_user.id, title=data.title,
                target_amount=data.target_amount, current_amount=data.current_amount,
                deadline=data.deadline, created_at=datetime.utcnow())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_dict(goal)


@router.put("/goals/{goal_id}")
def update_goal(goal_id: int, data: GoalUpdate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    goal = db.query(Goal).filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    if data.current_amount is not None:
        goal.current_amount = data.current_amount
    if data.title is not None:
        goal.title = data.title
    if data.target_amount is not None:
        goal.target_amount = data.target_amount
    if data.deadline is not None:
        goal.deadline = data.deadline
    db.commit()
    return _goal_dict(goal)


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    goal = db.query(Goal).filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    db.delete(goal)
    db.commit()
    return {"status": "deleted"}
