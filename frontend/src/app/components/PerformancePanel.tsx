"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import {
  RefreshCw, TrendingUp, TrendingDown, BarChart3,
  ExternalLink, ChevronDown, ChevronRight,
} from "lucide-react";
import { performanceApi } from "@/lib/api";
import { useLang } from "@/lib/LanguageContext";

interface NavPoint {
  date: string;
  nav: number;
  rebalance: boolean;
}

interface RebalanceEvent {
  id: number;
  date: string;
  status: string;
  trigger: string;
  changes_count: number;
  rationale: string;
  changes: { symbol: string; old_weight: number; new_weight: number; action: string }[];
}

interface Constituent {
  symbol: string;
  name: string;
  weight: number;
  price_change_7d: number;
  price_change_30d: number;
  market_cap_usd: number;
  ai_rationale: string;
  is_stablecoin: boolean;
}

interface Deposit {
  date: string;
  amount_usd: number;
  tx_hash: string;
  basescan: string;
}

interface IndexPerf {
  name: string;
  nav_usd: number;
  total_return_pct: number;
  return_30d_pct: number;
  return_7d_pct: number;
  aum_usd: number;
  subscriber_count: number;
  stablecoin_buffer_pct: number;
  max_drawdown_pct: number;
  last_rebalanced_at: string | null;
}

interface PerformancePanelProps {
  indexId: string;
  walletAddress?: string;
}

const DAYS_OPTIONS = [30, 60, 90] as const;

function fmtUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-gray border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="text-white font-semibold">NAV: ${payload[0].value.toFixed(4)}</p>
    </div>
  );
};

export default function PerformancePanel({ indexId, walletAddress }: PerformancePanelProps) {
  const [days, setDays] = useState<30 | 60 | 90>(90);
  const [data, setData] = useState<{
    index: IndexPerf;
    nav_series: NavPoint[];
    rebalance_history: RebalanceEvent[];
    constituents: Constituent[];
    investor_deposits: Deposit[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { t } = useLang();

  useEffect(() => {
    setLoading(true);
    performanceApi.get(indexId, days, walletAddress)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [indexId, days, walletAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30">
        <RefreshCw size={18} className="animate-spin mr-2" /> {t("perf_loading")}
      </div>
    );
  }

  if (!data) return <p className="text-white/30 text-sm text-center py-8">{t("perf_no_data")}</p>;

  const { index: idx, nav_series, rebalance_history, constituents, investor_deposits } = data;

  // Mark rebalance points on chart
  const chartData = nav_series.map((p) => ({ ...p, navDisplay: p.nav }));
  const rebalanceDates = new Set(nav_series.filter((p) => p.rebalance).map((p) => p.date));

  const navStart = nav_series[0]?.nav ?? 1;
  const navEnd = nav_series[nav_series.length - 1]?.nav ?? 1;
  const periodReturn = navStart > 0 ? ((navEnd - navStart) / navStart) * 100 : 0;
  const isPositive = periodReturn >= 0;

  return (
    <div className="space-y-5">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: t("perf_total_return"),
            value: fmtPct(idx.total_return_pct),
            color: idx.total_return_pct >= 0 ? "text-green-400" : "text-red-400",
            sub: t("perf_since_inception"),
          },
          {
            label: t("perf_30d"),
            value: fmtPct(idx.return_30d_pct),
            color: idx.return_30d_pct >= 0 ? "text-green-400" : "text-red-400",
            sub: t("perf_trailing"),
          },
          {
            label: t("perf_max_drawdown"),
            value: fmtPct(idx.max_drawdown_pct),
            color: "text-orange-400",
            sub: `in last ${days} days`,
          },
          {
            label: t("perf_stablecoin"),
            value: `${idx.stablecoin_buffer_pct.toFixed(1)}%`,
            color: "text-blue-400",
            sub: "USDC hedge allocation",
          },
        ].map((m) => (
          <div key={m.label} className="stat-card">
            <p className="stat-label">{m.label}</p>
            <p className={`stat-value ${m.color}`}>{m.value}</p>
            <p className="text-xs text-white/25">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* NAV Chart */}
      <div className="card border border-white/8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-brand-blue" />
            <h3 className="font-semibold text-white text-sm">{t("perf_nav_chart")}</h3>
            <span className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp size={12} className="inline mr-0.5" /> : <TrendingDown size={12} className="inline mr-0.5" />}
              {fmtPct(periodReturn)} ({days}d)
            </span>
          </div>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                  days === d ? "bg-brand-blue text-white" : "text-white/40 hover:text-white bg-white/5"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#3B82F6" : "#EF4444"} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isPositive ? "#3B82F6" : "#EF4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => fmtDate(v)}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(3)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {Array.from(rebalanceDates).map((d) => (
              <ReferenceLine key={d} x={d} stroke="rgba(251,191,36,0.3)" strokeDasharray="4 4" />
            ))}
            <Area
              type="monotone"
              dataKey="navDisplay"
              stroke={isPositive ? "#3B82F6" : "#EF4444"}
              strokeWidth={2}
              fill="url(#navGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {rebalanceDates.size > 0 && (
          <p className="text-xs text-white/25 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-amber-400/40" />
            Dashed lines mark rebalance events
          </p>
        )}
      </div>

      {/* Constituents */}
      {constituents.length > 0 && (
        <div className="card border border-white/8">
          <h3 className="font-semibold text-white text-sm mb-3">{t("perf_allocation")}</h3>
          <div className="space-y-2">
            {constituents.map((c) => (
              <div key={c.symbol}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-white/70 w-12 shrink-0">{c.symbol}</span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.is_stablecoin ? "bg-emerald-500/60" : "bg-brand-blue/70"}`}
                        style={{ width: `${Math.min(c.weight, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-white/50 w-12 text-right">{c.weight.toFixed(1)}%</span>
                  <span className={`text-xs w-16 text-right ${c.price_change_30d >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmtPct(c.price_change_30d)} 30d
                  </span>
                </div>
                {c.ai_rationale && (
                  <p className="text-xs text-white/25 mt-0.5 ml-15 pl-1">{c.ai_rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rebalance history */}
      {rebalance_history.length > 0 && (
        <div className="card border border-white/8">
          <h3 className="font-semibold text-white text-sm mb-3">
            {t("perf_rebalance_history")} <span className="text-white/30 font-normal">({rebalance_history.length})</span>
          </h3>
          <div className="space-y-2">
            {rebalance_history.map((r) => (
              <div key={r.id} className="rounded-lg bg-white/3 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                >
                  {expanded === r.id ? <ChevronDown size={13} className="text-white/40 shrink-0" /> : <ChevronRight size={13} className="text-white/40 shrink-0" />}
                  <span className="text-xs text-white/50">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    r.status === "executed" ? "bg-green-500/15 text-green-400" :
                    r.status === "dry_run" ? "bg-blue-500/15 text-blue-400" :
                    "bg-white/5 text-white/40"
                  }`}>{r.status}</span>
                  <span className="text-xs text-white/30">{r.trigger}</span>
                  <span className="ml-auto text-xs text-white/40">{r.changes_count} changes</span>
                </button>
                {expanded === r.id && (
                  <div className="px-4 pb-3 space-y-2 border-t border-white/5">
                    {r.rationale && <p className="text-xs text-white/50 pt-2">{r.rationale}</p>}
                    {r.changes.length > 0 && (
                      <div className="space-y-1">
                        {r.changes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${c.action === "add" ? "text-green-400" : c.action === "remove" ? "text-red-400" : "text-white/60"}`}>
                              {c.action === "add" ? "+" : c.action === "remove" ? "−" : "~"}
                            </span>
                            <span className="font-mono text-white/70">{c.symbol}</span>
                            {c.old_weight !== undefined && (
                              <span className="text-white/30">{c.old_weight}% → {c.new_weight}%</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investor deposits */}
      {investor_deposits.length > 0 && (
        <div className="card border border-white/8">
          <h3 className="font-semibold text-white text-sm mb-3">{t("perf_my_deposits")}</h3>
          <div className="space-y-2">
            {investor_deposits.map((d) => (
              <div key={d.tx_hash} className="flex items-center gap-3 p-2 rounded-lg bg-white/3 text-sm">
                <span className="text-xs text-white/40">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="text-white font-medium">${d.amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC</span>
                {d.basescan && (
                  <a href={d.basescan} target="_blank" rel="noopener noreferrer" className="ml-auto text-white/30 hover:text-white/60 transition-colors">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
