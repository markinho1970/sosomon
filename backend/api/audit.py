import os
import json
import glob as glob_module
import hashlib
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import AgentActivityLog, AlphaIndex

router = APIRouter(prefix="/api/audit", tags=["audit"])

_AUDIT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "audit", "proposals"))


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


@router.get("/proposals")
def get_proposal_audit(limit: int = Query(default=50, le=200)):
    """Public endpoint: all executed rebalance proposals with SHA-256 integrity hashes."""
    if not os.path.exists(_AUDIT_DIR):
        return {"proposals": [], "total": 0}

    files = sorted(
        glob_module.glob(os.path.join(_AUDIT_DIR, "*.json")),
        reverse=True,
    )[:limit]

    proposals = []
    for filepath in files:
        try:
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            # Verify integrity: recompute hash over the canonical content (without sha256 key)
            sha256_stored = data.pop("sha256", "")
            canonical     = json.dumps(data, sort_keys=True, indent=2)
            sha256_actual = hashlib.sha256(canonical.encode()).hexdigest()
            data["sha256"]        = sha256_stored
            data["hash_verified"] = (sha256_actual == sha256_stored)
            proposals.append(data)
        except Exception:
            continue

    return {"proposals": proposals, "total": len(proposals)}
