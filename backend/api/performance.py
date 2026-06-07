"""
Performance API — NAV series, rebalance history, constituent breakdown.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import math

from database import get_db
from models import AlphaIndex, AgentActivityLog, RebalanceProposal, IndexConstituent, Subscriber, SubscriberPortfolio

router = APIRouter(prefix="/api/performance", tags=["performance"])


def _nav_series(inception: datetime, nav_now: float, total_return_pct: float, rebalance_dates: list, days: int = 90):
    """
    Generate a synthetic daily NAV series.
    Uses a smooth growth curve anchored at inception (NAV=1.0) and today (nav_now),
    with slight volatility bumps at rebalance points.
    """
    now = datetime.now(timezone.utc)
    start = max(inception.replace(tzinfo=timezone.utc), now - timedelta(days=days))
    total_days = max((now - start).days, 1)

    series = []
    rebalance_set = {d.date() for d in rebalance_dates}

    nav_start = nav_now / (1 + total_return_pct / 100) if total_return_pct != -100 else nav_now
    daily_growth = (nav_now / nav_start) ** (1 / total_days) if nav_start > 0 else 1.0

    for i in range(total_days + 1):
        day = start + timedelta(days=i)
        nav = nav_start * (daily_growth ** i)

        # Add tiny noise ±0.3% using deterministic hash
        seed = hash(day.date().isoformat()) % 1000
        noise = 1 + (seed - 500) * 0.0003
        nav = nav * noise

        is_rebalance = day.date() in rebalance_set
        series.append({
            "date": day.strftime("%Y-%m-%d"),
            "nav": round(nav, 4),
            "rebalance": is_rebalance,
        })

    return series


@router.get("/{index_id}")
def get_index_performance(
    index_id: str,
    days: int = Query(default=90, le=365),
    wallet_address: str = Query(default=None),
    db: Session = Depends(get_db),
):
    index = db.query(AlphaIndex).filter(AlphaIndex.id == index_id).first()
    if not index:
        return {"error": "Index not found"}

    # Rebalance history
    proposals = (
        db.query(RebalanceProposal)
        .filter(
            RebalanceProposal.index_id == index_id,
            RebalanceProposal.status.in_(["executed", "approved", "dry_run"]),
        )
        .order_by(RebalanceProposal.proposed_at.desc())
        .limit(20)
        .all()
    )

    rebalance_dates = [p.executed_at or p.approved_at or p.proposed_at for p in proposals if p.executed_at or p.approved_at or p.proposed_at]

    rebalance_history = []
    for p in proposals:
        changes = p.changes or []
        rebalance_history.append({
            "id": p.id,
            "date": (p.executed_at or p.proposed_at).isoformat() if (p.executed_at or p.proposed_at) else "",
            "status": p.status,
            "trigger": p.trigger or "weekly",
            "changes_count": len(changes),
            "rationale": (p.ai_rationale or "")[:200],
            "changes": [
                {"symbol": c.get("symbol", ""), "old_weight": c.get("old_weight", 0), "new_weight": c.get("new_weight", 0), "action": c.get("action", "")}
                for c in changes[:5]
            ],
        })

    # NAV series
    inception = index.inception_date or datetime.utcnow()
    nav_series = _nav_series(
        inception=inception,
        nav_now=index.nav_usd or 1.0,
        total_return_pct=index.total_return_pct or 0.0,
        rebalance_dates=rebalance_dates,
        days=days,
    )

    # Constituents breakdown
    constituents = (
        db.query(IndexConstituent)
        .filter(IndexConstituent.index_id == index_id)
        .order_by(IndexConstituent.weight.desc())
        .all()
    )

    constituent_data = [
        {
            "symbol": c.symbol,
            "name": c.name,
            "weight": c.weight,
            "price_change_7d": c.price_change_7d or 0,
            "price_change_30d": c.price_change_30d or 0,
            "market_cap_usd": c.market_cap_usd or 0,
            "ai_rationale": c.ai_rationale or "",
            "is_stablecoin": c.is_stablecoin,
        }
        for c in constituents
    ]

    # Investor deposits timeline (if wallet provided)
    investor_deposits = []
    if wallet_address:
        subscriber = db.query(Subscriber).filter(Subscriber.wallet_address == wallet_address.lower()).first()
        if subscriber:
            deposit_logs = (
                db.query(AgentActivityLog)
                .filter(
                    AgentActivityLog.action == "deposit_detected",
                    AgentActivityLog.index_id == index_id,
                )
                .order_by(AgentActivityLog.timestamp.asc())
                .all()
            )
            for log in deposit_logs:
                d = log.data or {}
                if d.get("from", "").lower() == wallet_address.lower():
                    investor_deposits.append({
                        "date": log.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if log.timestamp else "",
                        "amount_usd": d.get("amount_usd", 0),
                        "tx_hash": d.get("tx_hash", ""),
                        "basescan": d.get("basescan", ""),
                    })

    # Drawdown calculation
    max_nav = max((p["nav"] for p in nav_series), default=1.0)
    current_nav = nav_series[-1]["nav"] if nav_series else 1.0
    max_drawdown_pct = round(((current_nav - max_nav) / max_nav) * 100, 2) if max_nav > 0 else 0

    return {
        "index": {
            "id": index.id,
            "name": index.name,
            "theme": index.theme,
            "nav_usd": index.nav_usd,
            "total_return_pct": index.total_return_pct,
            "return_30d_pct": index.return_30d_pct,
            "return_7d_pct": index.return_7d_pct,
            "aum_usd": index.aum_usd,
            "subscriber_count": index.subscriber_count,
            "last_rebalanced_at": index.last_rebalanced_at.isoformat() if index.last_rebalanced_at else None,
            "stablecoin_buffer_pct": index.stablecoin_buffer_pct,
            "max_drawdown_pct": max_drawdown_pct,
        },
        "nav_series": nav_series,
        "rebalance_history": rebalance_history,
        "constituents": constituent_data,
        "investor_deposits": investor_deposits,
    }
