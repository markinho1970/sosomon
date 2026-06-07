from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import AlphaIndex, SubscriberPortfolio
from schemas import IndexOut, ApiResponse

router = APIRouter(prefix="/api/indexes", tags=["indexes"])


@router.get("", response_model=ApiResponse)
def list_indexes(network_mode: str = Query("mainnet"), db: Session = Depends(get_db)):
    indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
    results = []
    for idx in indexes:
        aum = db.query(func.sum(SubscriberPortfolio.current_value_usd)).filter(
            SubscriberPortfolio.index_id == idx.id,
            SubscriberPortfolio.network_mode == network_mode,
        ).scalar() or 0.0
        idx_out = IndexOut.model_validate(idx).model_copy(update={"aum_usd": round(aum, 2)})
        results.append(idx_out)
    return ApiResponse(data=results)


@router.get("/{slug}", response_model=ApiResponse)
def get_index(slug: str, network_mode: str = Query("mainnet"), db: Session = Depends(get_db)):
    idx = db.query(AlphaIndex).filter(AlphaIndex.slug == slug).first()
    if not idx:
        raise HTTPException(status_code=404, detail="Index not found")
    aum = db.query(func.sum(SubscriberPortfolio.current_value_usd)).filter(
        SubscriberPortfolio.index_id == idx.id,
        SubscriberPortfolio.network_mode == network_mode,
    ).scalar() or 0.0
    idx_out = IndexOut.model_validate(idx).model_copy(update={"aum_usd": round(aum, 2)})
    return ApiResponse(data=idx_out)
