"""
API de anúncios — público (leitura) + admin (CRUD + sync).
"""

import os, time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from eth_account.messages import encode_defunct
from eth_account import Account

from database import get_db
from models import Announcement

router = APIRouter(tags=["announcements"])

_ADMIN_WALLET = "0x1a3ade798b60bd6e99ff3d84367cc7913115031c"
_SIGNATURE_MAX_AGE = 3600


def _verify_admin(x_wallet_address: str, x_sign_message: str, x_signature: str):
    if x_wallet_address.lower() != _ADMIN_WALLET.lower():
        raise HTTPException(status_code=403, detail="Not admin wallet")
    try:
        ts_str = x_sign_message.split("Timestamp: ")[-1].strip()
        ts = datetime.fromisoformat(ts_str).timestamp()
        if abs(time.time() - ts) > _SIGNATURE_MAX_AGE:
            raise HTTPException(status_code=401, detail="Signature expired")
        msg = encode_defunct(text=x_sign_message)
        recovered = Account.recover_message(msg, signature=x_signature)
        if recovered.lower() != _ADMIN_WALLET.lower():
            raise HTTPException(status_code=403, detail="Invalid signature")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Auth error: {e}")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AnnouncementOut(BaseModel):
    id: int
    source: str
    external_id: Optional[str]
    title: str
    body: Optional[str]
    labels: list
    severity: str
    affects_symbols: list
    action_deadline: Optional[datetime]
    published_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AnnouncementCreate(BaseModel):
    title: str
    body: Optional[str] = None
    labels: list[str] = []
    severity: str = "info"
    affects_symbols: list[str] = []
    action_deadline: Optional[datetime] = None
    source: str = "manual"


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    labels: Optional[list[str]] = None
    severity: Optional[str] = None
    affects_symbols: Optional[list[str]] = None
    action_deadline: Optional[datetime] = None
    is_active: Optional[bool] = None


# ─── Público ──────────────────────────────────────────────────────────────────

@router.get("/api/announcements")
def get_active_announcements(db: Session = Depends(get_db)):
    """Retorna anúncios ativos (público, sem autenticação)."""
    rows = (
        db.query(Announcement)
        .filter(Announcement.is_active == True)
        .order_by(Announcement.published_at.desc().nullslast(), Announcement.created_at.desc())
        .limit(50)
        .all()
    )
    return {"data": [AnnouncementOut.from_orm(r) for r in rows]}


# ─── Admin ────────────────────────────────────────────────────────────────────

@router.get("/api/admin/announcements")
def get_all_announcements(
    db: Session = Depends(get_db),
    x_wallet_address: str = Header(""),
    x_sign_message:   str = Header(""),
    x_signature:      str = Header(""),
):
    _verify_admin(x_wallet_address, x_sign_message, x_signature)
    rows = (
        db.query(Announcement)
        .order_by(Announcement.created_at.desc())
        .limit(100)
        .all()
    )
    return {"data": [AnnouncementOut.from_orm(r) for r in rows]}


@router.post("/api/admin/announcements")
def create_announcement(
    body: AnnouncementCreate,
    db: Session = Depends(get_db),
    x_wallet_address: str = Header(""),
    x_sign_message:   str = Header(""),
    x_signature:      str = Header(""),
):
    _verify_admin(x_wallet_address, x_sign_message, x_signature)
    ann = Announcement(
        source=body.source,
        title=body.title,
        body=body.body,
        labels=body.labels,
        severity=body.severity,
        affects_symbols=body.affects_symbols,
        action_deadline=body.action_deadline,
        published_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"data": AnnouncementOut.from_orm(ann)}


@router.patch("/api/admin/announcements/{ann_id}")
def update_announcement(
    ann_id: int,
    body: AnnouncementUpdate,
    db: Session = Depends(get_db),
    x_wallet_address: str = Header(""),
    x_sign_message:   str = Header(""),
    x_signature:      str = Header(""),
):
    _verify_admin(x_wallet_address, x_sign_message, x_signature)
    ann = db.query(Announcement).filter_by(id=ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(ann, field, val)
    db.commit()
    db.refresh(ann)
    return {"data": AnnouncementOut.from_orm(ann)}


@router.post("/api/admin/announcements/sync")
async def sync_announcements_now(
    db: Session = Depends(get_db),
    x_wallet_address: str = Header(""),
    x_sign_message:   str = Header(""),
    x_signature:      str = Header(""),
):
    """Força sincronização imediata com SoDEX (sem aguardar o scheduler)."""
    _verify_admin(x_wallet_address, x_sign_message, x_signature)
    from services.announcement_fetcher import sync_announcements
    result = await sync_announcements(db)
    return {"success": True, **result}
