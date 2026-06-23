// ─── Index Types ──────────────────────────────────────────────────────────────

export type IndexTheme = "ai-crypto" | "rwa" | "depin" | "defi" | "custom";

export type MacroStance = "risk-on" | "risk-neutral" | "risk-off";

export interface TokenConstituent {
  symbol: string;
  name: string;
  coingecko_id: string;
  weight: number;
  current_price_usd: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  price_change_7d: number;
  price_change_30d: number;
  ai_rationale: string;
  added_at: string;
  ejection_risk_pct: number; // 0-100: % do threshold de ejeção (-40% em 7d) atingido
}

export interface IndexRiskToken {
  symbol: string;
  weight: number;
  price_usd: number;
  change_7d_pct: number;
  change_30d_pct: number;
  ejection_risk_pct: number;
  at_risk: boolean;
  ai_rationale: string;
}

export interface IndexRiskData {
  index_id: string;
  network_mode: string;
  stablecoin_buffer_pct: number;
  risk_rules: {
    ejection_threshold_7d_pct: number;
    buffer_trigger_low_pct: number;
    buffer_low_allocation_pct: number;
    buffer_trigger_critical_pct: number;
    buffer_critical_allocation_pct: number;
    ejection_cooldown_days: number;
    max_single_token_weight: number;
  };
  tokens: IndexRiskToken[];
  last_proposal: {
    status: string;
    trigger: string;
    proposed_at: string;
    changes: Array<{ symbol: string; action: string; old_weight: number; new_weight: number; rationale: string }>;
    ai_rationale: string;
  } | null;
}

export interface AlphaIndex {
  id: string;
  slug: string; // e.g. "ai-crypto-infrastructure"
  name: string;
  theme: IndexTheme;
  description: string;
  inception_date: string;
  aum_usd: number;
  nav_usd: number; // Net Asset Value per token
  total_return_pct: number; // since inception
  return_30d_pct: number;
  return_7d_pct: number;
  btc_benchmark_30d: number; // BTC return over same period
  constituents: TokenConstituent[];
  stablecoin_buffer_pct: number; // current USDC/stablecoin %
  last_rebalanced_at: string;
  rebalance_summary: string; // AI-generated, what changed
  subscriber_count: number;
  management_fee_pct: number; // e.g. 0.75
}

// ─── Agent Activity ───────────────────────────────────────────────────────────

export type AgentType = "scout" | "rebalancer" | "narrator" | "deposit_monitor";
export type AgentActionType =
  | "inclusion"
  | "exclusion"
  | "weight_increase"
  | "weight_decrease"
  | "risk_override"
  | "rebalance"
  | "no_action"
  | "content_generated"
  | "deposit_detected"
  | "deposit_refunded"
  | "deposit_unattributed"
  | "withdrawal_executed"
  | "manual_credit";

export interface AgentActivity {
  id: string;
  agent: AgentType;
  action: AgentActionType;
  index_id?: string;
  token_symbol?: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ─── Macro ────────────────────────────────────────────────────────────────────

export interface MacroData {
  sosovalue_sentiment_score: number; // 0-100
  sentiment_label: string; // e.g. "Extreme Fear"
  sentiment_history_30d: Array<{ date: string; score: number }>;
  sector_flows: Array<{
    sector: string;
    flow_7d: "inflow" | "outflow" | "neutral";
    change_pct: number;
  }>;
  macro_stance: MacroStance;
  macro_stance_reason: string;
}

// ─── Subscriber / Portfolio ───────────────────────────────────────────────────

export interface SubscriberPortfolio {
  index_id: string;
  index_name: string;
  deposited_usd: number;
  current_value_usd: number;
  index_tokens_held: number;
  all_time_return_pct: number;
  return_30d_pct: number;
  high_water_mark_usd: number;
  days_invested: number;
  next_performance_fee_date: string;
  accrued_performance_fee_usd: number;
}

export interface Subscriber {
  id: string;
  wallet_address?: string;
  email?: string;
  is_pro: boolean;
  pro_since?: string;
  referral_code: string;
  referred_by?: string;
  days_streak: number;
  portfolios: SubscriberPortfolio[];
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface DashboardData {
  portfolios: SubscriberPortfolio[];
  recent_activity: AgentActivity[];
  macro: MacroData;
  total_value_usd: number;
  total_return_pct: number;
}
