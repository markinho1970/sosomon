from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AlphaIndex, RebalanceProposal, Subscriber
from schemas import PublicStatsOut, ApiResponse

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=ApiResponse)
def get_stats(db: Session = Depends(get_db)):
    total_aum = db.query(func.sum(AlphaIndex.aum_usd)).scalar() or 0.0
    active_indexes = db.query(func.count(AlphaIndex.id)).filter(AlphaIndex.is_active == True).scalar() or 0
    total_subs = db.query(func.count(Subscriber.id)).scalar() or 0
    total_rebalances = db.query(func.count(RebalanceProposal.id)).filter(
        RebalanceProposal.status == "executed"
    ).scalar() or 0

    avg_return = db.query(func.avg(AlphaIndex.return_30d_pct)).filter(
        AlphaIndex.is_active == True
    ).scalar() or 0.0

    return ApiResponse(data=PublicStatsOut(
        total_aum_usd=total_aum,
        active_indexes=active_indexes,
        total_subscribers=total_subs,
        total_rebalances=total_rebalances,
        avg_return_30d_pct=round(avg_return, 2),
    ))
