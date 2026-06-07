from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import AgentActivityLog, AlphaIndex

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/deposits")
def get_deposit_audit(
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
):
    """Public endpoint: returns all on-chain deposits detected by deposit_monitor."""
    logs = (
        db.query(AgentActivityLog)
        .filter(AgentActivityLog.action == "deposit_detected")
        .order_by(AgentActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    deposits = []
    for log in logs:
        d = log.data or {}
        index = db.query(AlphaIndex).filter(AlphaIndex.id == log.index_id).first()
        deposits.append({
            "tx_hash":      d.get("tx_hash", ""),
            "from_address": d.get("from", ""),
            "amount_usd":   d.get("amount_usd", 0),
            "block_number": d.get("block", 0),
            "timestamp":    log.timestamp.isoformat() if log.timestamp else "",
            "basescan_url": d.get("basescan", ""),
            "index_name":   index.name if index else "—",
            "network":      d.get("network", "base"),
            "chain_id":     d.get("chain_id", 8453),
        })

    return {"deposits": deposits, "total": len(deposits)}
