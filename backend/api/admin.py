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
from services.sodex import get_portfolio_snapshot, get_trade_history

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SIGNATURE_MAX_AGE = 3600  # 1 hora de validade da assinatura
_ADMIN_WALLET = "0x1a3ade798b60bd6e99ff3d84367cc7913115031c"  # founder wallet (lowercase)


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

    # Verifica se é a carteira admin — nega acesso a qualquer outra carteira
    if recovered.lower() != _ADMIN_WALLET:
        raise HTTPException(status_code=403, detail="Access denied: not the admin wallet")

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

    if recovered.lower() != _ADMIN_WALLET:
        raise HTTPException(status_code=403, detail="Access denied: not the admin wallet")

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


class RunRebalancerRequest(BaseModel):
    dry_run: bool = True


@router.post("/run-rebalancer")
async def run_rebalancer(req: RunRebalancerRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Dispara o ciclo completo do Rebalancer agent (pode gerar nova proposta)."""
    from agents.rebalancer import check_and_propose_rebalances
    try:
        await check_and_propose_rebalances()
        pending = db.query(func.count(RebalanceProposal.id)).filter(
            RebalanceProposal.status == "pending"
        ).scalar() or 0
        return {"success": True, "message": "Rebalancer executed", "pending_proposals": pending}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ExecuteProposalRequest(BaseModel):
    dry_run: bool = False


@router.post("/proposals/{proposal_id}/execute")
async def execute_proposal(
    proposal_id: int,
    req: ExecuteProposalRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Executa proposta aprovada via SoDEX (dry_run=False envia ordens reais)."""
    from agents.rebalancer import apply_proposal
    proposal = db.query(RebalanceProposal).filter(RebalanceProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status not in ("approved", "pending"):
        raise HTTPException(status_code=400, detail=f"Proposal status is '{proposal.status}' — must be 'approved' to execute")

    # Auto-approve if still pending and founder is explicitly executing
    if proposal.status == "pending":
        proposal.status = "approved"
        proposal.approved_at = datetime.utcnow()
        db.commit()

    try:
        await apply_proposal(proposal_id, db, dry_run=req.dry_run)
        db.refresh(proposal)
        return {
            "success": True,
            "proposal_id": proposal_id,
            "status": proposal.status,
            "dry_run": req.dry_run,
            "orders_count": len(proposal.execution_orders or []),
            "execution_orders": proposal.execution_orders or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio")
async def admin_portfolio(_: None = Depends(require_admin)):
    """Snapshot atual do portfolio na SoDEX: saldos, valores USD, pesos."""
    try:
        snapshot = await get_portfolio_snapshot()
        return {"data": snapshot}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades")
async def admin_trades(limit: int = 50, _: None = Depends(require_admin)):
    """Histórico de trades executados na SoDEX."""
    try:
        trades = await get_trade_history(limit=limit)
        return {"data": trades, "count": len(trades)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-nav-update")
async def run_nav_update(_: None = Depends(require_admin)):
    """Dispara atualização imediata de NAV para todos os índices (sem aguardar o scheduler)."""
    from services.nav_updater import update_all_navs
    try:
        await update_all_navs()
        return {"success": True, "message": "NAV update completed — prices, NAV and portfolios refreshed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fund-wallet")
async def admin_fund_wallet(network_mode: str = "mainnet", _: None = Depends(require_admin)):
    """Retorna saldos ETH e USDC da fund wallet na rede especificada."""
    from services.deposit_monitor import get_fund_wallet_info
    try:
        info = await get_fund_wallet_info(network_mode)
        return {"data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
def admin_stats(network_mode: str = "mainnet", db: Session = Depends(get_db), _: None = Depends(require_admin)):
    # AUM and investor count filtered by network
    portfolios = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.network_mode == network_mode
    ).all()

    total_aum = sum(p.current_value_usd for p in portfolios)
    sub_ids = list({p.subscriber_id for p in portfolios})
    total_subs = len(sub_ids)
    pro_subs = 0
    if sub_ids:
        pro_subs = db.query(func.count(Subscriber.id)).filter(
            Subscriber.id.in_(sub_ids), Subscriber.is_pro == True
        ).scalar() or 0

    pending_proposals = db.query(func.count(RebalanceProposal.id)).filter(
        RebalanceProposal.status == "pending"
    ).scalar() or 0

    indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
    index_summary = []
    for i in indexes:
        idx_portfolios = [p for p in portfolios if p.index_id == i.id]
        index_summary.append({
            "id": i.id,
            "name": i.name,
            "aum_usd": round(sum(p.current_value_usd for p in idx_portfolios), 2),
            "subscriber_count": len({p.subscriber_id for p in idx_portfolios}),
            "return_30d_pct": i.return_30d_pct,
            "last_rebalanced_at": i.last_rebalanced_at.isoformat() if i.last_rebalanced_at else None,
        })

    return {
        "data": {
            "total_subscribers": total_subs,
            "pro_subscribers": pro_subs,
            "total_aum_usd": round(total_aum, 2),
            "pending_proposals": pending_proposals,
            "indexes": index_summary,
            "network_mode": network_mode,
        }
    }


@router.get("/report")
def admin_report(network_mode: str = "mainnet", db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Relatório gerencial consolidado da plataforma."""
    now = datetime.utcnow()

    indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
    all_portfolios = db.query(SubscriberPortfolio).all()
    mainnet_portfolios = [p for p in all_portfolios if p.network_mode == "mainnet"]
    testnet_portfolios = [p for p in all_portfolios if p.network_mode == "testnet"]
    mainnet_ids = {p.subscriber_id for p in mainnet_portfolios}
    testnet_ids = {p.subscriber_id for p in testnet_portfolios}
    all_ids = mainnet_ids | testnet_ids

    # IDs e portfolios filtrados pela rede selecionada
    selected_portfolios = mainnet_portfolios if network_mode == "mainnet" else testnet_portfolios
    selected_ids = mainnet_ids if network_mode == "mainnet" else testnet_ids

    index_summary = []
    for idx in indexes:
        idx_portfolios = [p for p in selected_portfolios if p.index_id == idx.id]
        index_summary.append({
            "id": idx.id,
            "name": idx.name,
            "aum_usd": round(sum(p.current_value_usd or 0 for p in idx_portfolios), 2),
            "nav_usd": round(idx.nav_usd or 1, 4),
            "return_7d_pct": round(idx.return_7d_pct or 0, 2),
            "return_30d_pct": round(idx.return_30d_pct or 0, 2),
            "total_return_pct": round(idx.total_return_pct or 0, 2),
            "subscriber_count": len({p.subscriber_id for p in idx_portfolios}),
            "management_fee_pct": idx.management_fee_pct or 0.75,
            "last_rebalanced_at": idx.last_rebalanced_at.isoformat() if idx.last_rebalanced_at else None,
        })

    pro_count = 0
    if selected_ids:
        pro_count = db.query(func.count(Subscriber.id)).filter(
            Subscriber.id.in_(list(selected_ids)), Subscriber.is_pro == True
        ).scalar() or 0

    proposals = db.query(RebalanceProposal).all()
    by_status: dict = {}
    by_trigger: dict = {}
    for p in proposals:
        by_status[p.status] = by_status.get(p.status, 0) + 1
        t = p.trigger or "unknown"
        by_trigger[t] = by_trigger.get(t, 0) + 1

    executed = [p for p in proposals if p.status == "executed" and p.executed_at and p.proposed_at]
    avg_hours = None
    if executed:
        deltas = [(p.executed_at - p.proposed_at).total_seconds() / 3600 for p in executed]
        avg_hours = round(sum(deltas) / len(deltas), 1)

    recent_all = db.query(AgentActivityLog).order_by(AgentActivityLog.timestamp.desc()).limit(50).all()
    activity = []
    for a in recent_all:
        a_data = a.data or {}
        log_net = a_data.get("network_mode")
        if log_net and log_net != network_mode:
            continue
        activity.append({
            "agent": a.agent,
            "action": a.action,
            "description": (a.description or "")[:120],
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        })
        if len(activity) >= 10:
            break

    return {
        "data": {
            "generated_at": now.isoformat() + "Z",
            "platform": {
                "network_mode": network_mode,
                "total_aum_usd": round(sum(p.current_value_usd or 0 for p in selected_portfolios), 2),
                "total_indexes": len(indexes),
                "total_investors": len(selected_ids),
                "pro_investors": pro_count,
                "mainnet": {
                    "investors": len(mainnet_ids),
                    "aum_usd": round(sum(p.current_value_usd or 0 for p in mainnet_portfolios), 2),
                },
                "testnet": {
                    "investors": len(testnet_ids),
                    "aum_usd": round(sum(p.current_value_usd or 0 for p in testnet_portfolios), 2),
                },
            },
            "indexes": index_summary,
            "proposals": {
                "total": len(proposals),
                "by_status": by_status,
                "by_trigger": by_trigger,
                "avg_approval_hours": avg_hours,
            },
            "recent_activity": activity,
        }
    }


@router.get("/movements")
def admin_movements(
    network_mode: str = "mainnet",
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Histórico de movimentações do fundo: depósitos, estornos, saques, créditos manuais."""
    MOVEMENT_ACTIONS = ["deposit_detected", "deposit_refunded", "withdrawal_executed", "manual_credit"]
    logs = (
        db.query(AgentActivityLog)
        .filter(AgentActivityLog.action.in_(MOVEMENT_ACTIONS))
        .order_by(AgentActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    movements = []
    for log in logs:
        data = log.data or {}
        log_net = data.get("network_mode", "mainnet")
        if log_net != network_mode:
            continue

        mov_type = {
            "deposit_detected": "deposit",
            "deposit_refunded": "refund",
            "withdrawal_executed": "withdrawal",
            "manual_credit": "manual",
        }.get(log.action, "other")

        movements.append({
            "id": log.id,
            "type": mov_type,
            "action": log.action,
            "amount_usd": data.get("amount_usd", 0),
            "wallet": data.get("from") or data.get("wallet_address") or data.get("wallet", ""),
            "index_id": log.index_id or "",
            "tx_hash": data.get("tx_hash", ""),
            "refund_tx": data.get("refund_tx", ""),
            "refund_ok": data.get("refund_ok"),
            "refund_basescan": data.get("refund_basescan", ""),
            "basescan": data.get("basescan", ""),
            "manual_credit": data.get("manual_credit", False),
            "reason": data.get("reason", ""),
            "description": (log.description or "")[:180],
            "timestamp": log.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if log.timestamp else "",
            "network_mode": log_net,
        })

    return {"movements": movements}
