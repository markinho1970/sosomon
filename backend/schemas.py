from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


# ─── Constituent ──────────────────────────────────────────────────────────────

class ConstituentOut(BaseModel):
    symbol: str
    name: str
    coingecko_id: Optional[str] = None
    weight: float
    current_price_usd: float
    market_cap_usd: float
    volume_24h_usd: float
    price_change_7d: float
    price_change_30d: float
    ai_rationale: str
    added_at: datetime

    class Config:
        from_attributes = True


# ─── Index ────────────────────────────────────────────────────────────────────

class IndexOut(BaseModel):
    id: str
    slug: str
    name: str
    theme: str
    description: Optional[str]
    inception_date: Optional[datetime]
    aum_usd: float
    nav_usd: float
    total_return_pct: float
    return_30d_pct: float
    return_7d_pct: float
    btc_benchmark_30d: float
    stablecoin_buffer_pct: float
    subscriber_count: int
    management_fee_pct: float
    last_rebalanced_at: Optional[datetime]
    rebalance_summary: str
    constituents: List[ConstituentOut] = []

    class Config:
        from_attributes = True


# ─── Agent Activity ───────────────────────────────────────────────────────────

class AgentActivityOut(BaseModel):
    id: str
    index_id: Optional[str]
    agent: str
    action: str
    token_symbol: Optional[str]
    description: str
    timestamp: datetime
    data: Optional[Any]

    class Config:
        from_attributes = True


# ─── Macro ────────────────────────────────────────────────────────────────────

class SectorFlow(BaseModel):
    sector: Optional[str] = None
    flow_7d: Optional[str] = None
    change_pct: Optional[float] = None
    marketcap_dom: Optional[float] = None


class MacroOut(BaseModel):
    sosovalue_sentiment_score: float
    sentiment_label: str
    sector_flows: List[SectorFlow]
    macro_stance: str
    macro_stance_reason: str
    etf_flow: Optional[Any] = None
    stablecoin_dominance: Optional[Any] = None
    upcoming_macro_events: Optional[Any] = None


# ─── Stats ────────────────────────────────────────────────────────────────────

class PublicStatsOut(BaseModel):
    total_aum_usd: float
    active_indexes: int
    total_subscribers: int
    total_rebalances: int
    avg_return_30d_pct: float
    pending_proposals: int = 0


# ─── Subscriber / Portfolio ───────────────────────────────────────────────────

class PortfolioOut(BaseModel):
    index_id: str
    index_name: str
    deposited_usd: float
    current_value_usd: float
    index_tokens_held: float
    all_time_return_pct: float
    return_30d_pct: float
    high_water_mark_usd: float
    days_invested: int
    next_performance_fee_date: str
    accrued_performance_fee_usd: float


class DashboardOut(BaseModel):
    portfolios: List[PortfolioOut]
    recent_activity: List[AgentActivityOut]
    macro: MacroOut
    total_value_usd: float
    total_return_pct: float


# ─── Generic wrapper ──────────────────────────────────────────────────────────

class ApiResponse(BaseModel):
    data: Any
    success: bool = True
    message: Optional[str] = None
