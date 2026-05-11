import os
import time
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
from eth_account.messages import encode_defunct
from eth_account import Account

from database import get_db
from models import RebalanceProposal, AlphaIndex, AgentActivityLog, Subscriber, SubscriberPortfolio

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SIGNATURE_MAX_AGE = 300  # 5 minutos de validade da assinatura


class WalletAuthRequest(BaseModel):
    address: str
    message: str
    signature: str


@router.post("/auth")
def wallet_auth(req: WalletAuthRequest):
    """Verifica assinatura EIP-191 e retorna o endereço verificado."""
    try:
        msg_encoded = encode_defunct(text=req.message)
        recovered = Account.recover_message(msg_encoded, signature=req.signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if recovered.lower() != req.address.lower():
        raise HTTPException(status_code=401, detail="Signature does not match address")

    # Verifica timestamp na mensagem para evitar replay attacks
    try:
        ts = int(req.message.split("ts:")[-1].strip())
        if abs(time.time() - ts) > _SIGNATURE_MAX_AGE:
            raise HTTPException(status_code=401, detail="Signature expired")
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid message format")

    return {"verified": True, "address": recovered}


def require_admin(x_wallet_address: str = Header(default=""), x_signature: str = Header(default=""), x_sign_message: str = Header(default="")):
    """Verifica assinatura de wallet em cada request protegido."""
    if not x_wallet_address or not x_signature or not x_sign_message:
        raise HTTPException(status_code=401, detail="Wallet authentication required")
    try:
        msg_encoded = encode_defunct(text=x_sign_message)
        recovered = Account.recover_message(msg_encoded, signature=x_signature)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid signature")

    if recovered.lower() != x_wallet_address.lower():
        raise HTTPException(status_code=401, detail="Signature does not match address")

    try:
        ts = int(x_sign_message.split("ts:")[-1].strip())
        if abs(time.time() - ts) > _SIGNATURE_MAX_AGE:
            raise HTTPException(status_code=401, detail="Signature expired — please re-authenticate")
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid message format")


@router.get("/proposals")
def list_proposals(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    proposals = db.query(RebalanceProposal).order_by(
        RebalanceProposal.proposed_at.desc()
    ).limit(50).all()

    result = []
    for p in proposals:
        index = db.query(AlphaIndex).filter(AlphaIndex.id == p.index_id).first()
        result.append({
            "id": p.id,
            "index_id": p.index_id,
            "index_name": index.name if index else p.index_id,
            "status": p.status,
            "trigger": p.trigger,
            "proposed_at": p.proposed_at.isoformat() if p.proposed_at else None,
            "approved_at": p.approved_at.isoformat() if p.approved_at else None,
            "executed_at": p.executed_at.isoformat() if p.executed_at else None,
            "changes": p.changes or [],
            "ai_rationale": p.ai_rationale,
        })

    return {"data": result}


@router.post("/proposals/{proposal_id}/approve")
def approve_proposal(proposal_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    proposal = db.query(RebalanceProposal).filter(
        RebalanceProposal.id == proposal_id
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail=f"Proposal is already {proposal.status}")

    proposal.status = "approved"
    proposal.approved_at = datetime.utcnow()

    log = AgentActivityLog(
        id=str(uuid.uuid4()),
        index_id=proposal.index_id,
        agent="rebalancer",
        action="rebalance",
        description=f"Rebalance proposal #{proposal_id} approved by founder. Trigger: {proposal.trigger}",
        timestamp=datetime.utcnow(),
    )
    db.add(log)
    db.commit()

    return {"success": True, "proposal_id": proposal_id, "status": "approved"}


@router.post("/proposals/{proposal_id}/reject")
def reject_proposal(proposal_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    proposal = db.query(RebalanceProposal).filter(
        RebalanceProposal.id == proposal_id
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail=f"Proposal is already {proposal.status}")

    proposal.status = "rejected"
    db.commit()

    return {"success": True, "proposal_id": proposal_id, "status": "rejected"}


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    total_subs = db.query(func.count(Subscriber.id)).scalar() or 0
    pro_subs = db.query(func.count(Subscriber.id)).filter(Subscriber.is_pro == True).scalar() or 0
    total_aum = db.query(func.sum(AlphaIndex.aum_usd)).scalar() or 0.0
    pending_proposals = db.query(func.count(RebalanceProposal.id)).filter(
        RebalanceProposal.status == "pending"
    ).scalar() or 0

    indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
    index_summary = [
        {
            "id": i.id,
            "name": i.name,
            "aum_usd": i.aum_usd,
            "subscriber_count": i.subscriber_count,
            "return_30d_pct": i.return_30d_pct,
            "last_rebalanced_at": i.last_rebalanced_at.isoformat() if i.last_rebalanced_at else None,
        }
        for i in indexes
    ]

    return {
        "data": {
            "total_subscribers": total_subs,
            "pro_subscribers": pro_subs,
            "total_aum_usd": round(total_aum, 2),
            "pending_proposals": pending_proposals,
            "indexes": index_summary,
        }
    }
