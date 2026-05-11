from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import AlphaIndex
from schemas import IndexOut, ApiResponse

router = APIRouter(prefix="/api/indexes", tags=["indexes"])


@router.get("", response_model=ApiResponse)
def list_indexes(db: Session = Depends(get_db)):
    indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
    return ApiResponse(data=[IndexOut.model_validate(i) for i in indexes])


@router.get("/{slug}", response_model=ApiResponse)
def get_index(slug: str, db: Session = Depends(get_db)):
    idx = db.query(AlphaIndex).filter(AlphaIndex.slug == slug).first()
    if not idx:
        raise HTTPException(status_code=404, detail="Index not found")
    return ApiResponse(data=IndexOut.model_validate(idx))
