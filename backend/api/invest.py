from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from database import get_db
from models import AlphaIndex, Subscriber, SubscriberPortfolio

router = APIRouter(prefix="/api/invest", tags=["invest"])


@router.get("/fund-wallet")
async def get_fund_wallet():
    """Returns fund wallet address and current USDC balance on Base."""
    from services.deposit_monitor import get_fund_wallet_info
    return await get_fund_wallet_info()


class InvestRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float


@router.post("")
def invest(req: InvestRequest, db: Session = Depends(get_db)):
    if req.amount_usd < 5:
        raise HTTPException(status_code=400, detail="Minimum investment is $5")

    index = db.query(AlphaIndex).filter(
        AlphaIndex.id == req.index_id,
        AlphaIndex.is_active == True,
    ).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Get or create subscriber
    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req.wallet_address
    ).first()
    if not subscriber:
        subscriber = Subscriber(
            id=str(uuid.uuid4()),
            wallet_address=req.wallet_address,
            referral_code=str(uuid.uuid4())[:8].upper(),
        )
        db.add(subscriber)
        db.flush()

    tokens_to_mint = req.amount_usd / max(index.nav_usd, 0.0001)

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
    ).first()

    if portfolio:
        portfolio.deposited_usd += req.amount_usd
        portfolio.current_value_usd += req.amount_usd
        portfolio.index_tokens_held += tokens_to_mint
        portfolio.last_updated_at = datetime.utcnow()
        if portfolio.current_value_usd > portfolio.high_water_mark_usd:
            portfolio.high_water_mark_usd = portfolio.current_value_usd
    else:
        portfolio = SubscriberPortfolio(
            subscriber_id=subscriber.id,
            index_id=req.index_id,
            deposited_usd=req.amount_usd,
            current_value_usd=req.amount_usd,
            index_tokens_held=tokens_to_mint,
            high_water_mark_usd=req.amount_usd,
        )
        db.add(portfolio)
        index.subscriber_count = (index.subscriber_count or 0) + 1

    index.aum_usd = (index.aum_usd or 0) + req.amount_usd
    db.commit()

    return {
        "success": True,
        "wallet_address": req.wallet_address,
        "index_id": req.index_id,
        "amount_usd": req.amount_usd,
        "tokens_received": round(tokens_to_mint, 6),
        "nav_usd": index.nav_usd,
    }


class WithdrawRequest(BaseModel):
    wallet_address: str
    index_id: str
    amount_usd: float


@router.post("/withdraw")
def withdraw(req: WithdrawRequest, db: Session = Depends(get_db)):
    if req.amount_usd < 5:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $5")

    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == req.wallet_address
    ).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="No position found")

    portfolio = db.query(SubscriberPortfolio).filter(
        SubscriberPortfolio.subscriber_id == subscriber.id,
        SubscriberPortfolio.index_id == req.index_id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No position in this index")

    if req.amount_usd > portfolio.current_value_usd:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    index = db.query(AlphaIndex).filter(AlphaIndex.id == req.index_id).first()
    nav = index.nav_usd if index and index.nav_usd else 1.0

    tokens_to_burn = req.amount_usd / nav

    profit_above_hwm = max(0, portfolio.current_value_usd - portfolio.high_water_mark_usd)
    perf_fee = round(min(profit_above_hwm, req.amount_usd) * 0.15, 4)
    net_usd = round(req.amount_usd - perf_fee, 4)

    portfolio.current_value_usd -= req.amount_usd
    portfolio.index_tokens_held = max(0, portfolio.index_tokens_held - tokens_to_burn)
    portfolio.last_updated_at = datetime.utcnow()
    if portfolio.current_value_usd < portfolio.high_water_mark_usd:
        portfolio.high_water_mark_usd = portfolio.current_value_usd

    if index:
        index.aum_usd = max(0, (index.aum_usd or 0) - req.amount_usd)
        if portfolio.current_value_usd <= 0:
            index.subscriber_count = max(0, (index.subscriber_count or 1) - 1)

    db.commit()

    return {
        "success": True,
        "wallet_address": req.wallet_address,
        "index_id": req.index_id,
        "amount_usd": req.amount_usd,
        "tokens_burned": round(tokens_to_burn, 6),
        "performance_fee_usd": perf_fee,
        "net_usd": net_usd,
        "message": f"Withdrawal of ${net_usd} USDC will be sent to your wallet on Base within 24h.",
    }


@router.get("/portfolio/{wallet_address}")
def get_portfolio(wallet_address: str, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(
        Subscriber.wallet_address == wallet_address
    ).first()
    if not subscriber:
        return {"portfolios": [], "subscriber": None}

    portfolios = []
    for p in subscriber.portfolios:
        index = db.query(AlphaIndex).filter(AlphaIndex.id == p.index_id).first()
        if not index:
            continue

        all_time_return = (
            ((p.current_value_usd - p.deposited_usd) / p.deposited_usd * 100)
            if p.deposited_usd > 0 else 0
        )
        profit_above_hwm = max(0, p.current_value_usd - p.high_water_mark_usd)
        accrued_fee = round(profit_above_hwm * 0.15, 2)

        portfolios.append({
            "index_id": p.index_id,
            "index_name": index.name,
            "theme": index.theme,
            "deposited_usd": p.deposited_usd,
            "current_value_usd": p.current_value_usd,
            "index_tokens_held": p.index_tokens_held,
            "all_time_return_pct": round(all_time_return, 2),
            "return_30d_pct": index.return_30d_pct,
            "high_water_mark_usd": p.high_water_mark_usd,
            "days_invested": p.days_invested,
            "accrued_performance_fee_usd": accrued_fee,
        })

    return {
        "portfolios": portfolios,
        "subscriber": {
            "id": subscriber.id,
            "wallet_address": subscriber.wallet_address,
            "is_pro": subscriber.is_pro,
            "days_streak": subscriber.days_streak,
        },
    }
