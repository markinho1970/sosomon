from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import AgentActivityLog
from schemas import AgentActivityOut, ApiResponse

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/activity", response_model=ApiResponse)
def get_activity(
    limit: int = Query(default=20, le=100),
    index_id: str = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(AgentActivityLog)
    if index_id:
        q = q.filter(AgentActivityLog.index_id == index_id)
    activities = q.order_by(AgentActivityLog.timestamp.desc()).limit(limit).all()
    return ApiResponse(data=[AgentActivityOut.model_validate(a) for a in activities])
