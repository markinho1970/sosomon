"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  TrendingUp, TrendingDown, RefreshCw, Bot, BarChart3,
  AlertTriangle, Zap, Award, Wallet,
} from "lucide-react";
import Navbar from "../components/Navbar";
import AgentActivityFeed from "../components/AgentActivityFeed";
import MacroWidget from "../components/MacroWidget";
import NetworkGuard from "../components/NetworkGuard";
import WithdrawButton from "../components/WithdrawButton";
import PerformancePanel from "../components/PerformancePanel";
import { investApi, agentApi, macroApi } from "@/lib/api";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { useLang } from "@/lib/LanguageContext";
import type { AgentActivity, MacroData } from "@/types";

const THEME_BADGE: Record<string, string> = {
  "ai-crypto": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  rwa: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  depin: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};
const THEME_BORDER: Record<string, string> = {
  "ai-crypto": "border-l-purple-500/40",
  rwa: "border-l-emerald-500/40",
  depin: "border-l-cyan-500/40",
};

function fmtUSD(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
}
function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

interface Portfolio {
  index_id: string;
  index_name: string;
  theme: string;
  deposited_usd: number;
  current_value_usd: number;
  index_tokens_held: number;
  all_time_return_pct: number;
  return_30d_pct: number;
  high_water_mark_usd: number;
  days_invested: number;
  accrued_performance_fee_usd: number;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { networkMode } = useNetworkMode();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance" | "activity" | "macro">("portfolio");
  const [selectedIndexForPerf, setSelectedIndexForPerf] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [subscriber, setSubscriber] = useState<{ is_pro: boolean; days_streak: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refundNotices, setRefundNotices] = useState<Array<{amount_usd: number; minimum_usd: number; tx_hash: string}>>([]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      investApi.getPortfolio(address, networkMode),
      agentApi.getRecentActivity(20),
      macroApi.get(),
      investApi.getRefunds(address, networkMode),
    ])
      .then(([portfolioData, activityData, macroData, refundsData]: any[]) => {
        if (cancelled) return;
        setPortfolios(portfolioData.portfolios ?? []);
        setSubscriber(portfolioData.subscriber ?? null);
        setActivities(activityData ?? []);
        setMacro(macroData ?? null);
        setRefundNotices(refundsData ?? []);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, networkMode]);

  const totalValue = portfolios.reduce((s, p) => s + p.current_value_usd, 0);
  const totalDeposited = portfolios.reduce((s, p) => s + p.deposited_usd, 0);
  const totalReturnPct = totalDeposited > 0 ? ((totalValue - totalDeposited) / totalDeposited) * 100 : 0;
  const totalFees = portfolios.reduce((s, p) => s + p.accrued_performance_fee_usd, 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-dark">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 pt-32 pb-16 flex flex-col items-center justify-center text-center gap-6">
          <Wallet size={48} className="text-white/20" />
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("dash_connect_wallet")}</h1>
            <p className="text-white/40 max-w-sm mx-auto">{t("dash_connect_desc")}</p>
          </div>
          <ConnectButton />
          <Link href="/indexes" className="text-sm text-white/30 hover:text-white transition-colors">
            {t("dash_browse_no_connect")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-16">
        {refundNotices.length > 0 && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-1">&#9888; {t("dash_refund_title")}</p>
              {refundNotices.map((r, i) => (
                <p key={i} className="text-white/70 text-sm">
                  ${r.amount_usd.toFixed(2)} USDC — {t("mov_below_min")} ${r.minimum_usd}
                  {r.tx_hash && <span className="text-white/40 ml-2 font-mono text-xs">{r.tx_hash.slice(0,16)}…</span>}
                </p>
              ))}
            </div>
            <button onClick={() => setRefundNotices([])} className="text-white/30 hover:text-white/70 text-lg leading-none shrink-0">&#x2715;</button>
          </div>
        )}

        <NetworkGuard />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{t("dash_title")}</h1>
            <p className="text-white/40 text-sm">
              {t("dash_connected")} <span className="font-mono text-white/60">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(subscriber?.days_streak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <Award size={12} />
                {subscriber!.days_streak}-day streak
              </div>
            )}
            {subscriber?.is_pro && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-medium">
                <Zap size={12} />
                Pro Member
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30">
            <RefreshCw size={20} className="animate-spin mr-2" /> {t("dash_loading")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="stat-card">
                <p className="stat-label">{t("dash_total_value")}</p>
                <p className="stat-value">{fmtUSD(totalValue)}</p>
                <p className={totalReturnPct >= 0 ? "stat-change-positive" : "stat-change-negative"}>
                  {fmtPct(totalReturnPct)} {t("dash_alltime")}
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-label">{t("dash_total_deposited")}</p>
                <p className="stat-value">{fmtUSD(totalDeposited)}</p>
                <p className="text-xs text-white/30">{t("dash_across", { n: portfolios.length })}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">{t("dash_30d")}</p>
                {(() => {
                  const w30d = portfolios.length > 0
                    ? portfolios.reduce((s, p) => s + p.return_30d_pct * p.current_value_usd, 0) / (totalValue || 1)
                    : null;
                  return (
                    <p className={`stat-value ${w30d === null ? "text-white/30" : w30d >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {w30d !== null ? fmtPct(w30d) : "—"}
                    </p>
                  );
                })()}
                <p className="text-xs text-white/30">{t("dash_wavg")}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">{t("dash_fee")}</p>
                <p className="stat-value">{fmtUSD(totalFees)}</p>
                <p className="text-xs text-white/30">{t("dash_hwm")}</p>
              </div>
            </div>

            <div className="flex gap-1 mb-6 bg-white/3 rounded-xl p-1 w-fit flex-wrap">
              {(["portfolio", "performance", "activity", "macro"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "performance" && !selectedIndexForPerf && portfolios.length > 0) {
                      setSelectedIndexForPerf(portfolios[0].index_id);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeTab === tab ? "bg-brand-blue text-white" : "text-white/40 hover:text-white"
                  }`}
                >
                  {tab === "activity" ? t("tab_activity") : tab === "macro" ? t("tab_macro") : tab === "performance" ? t("tab_performance") : t("tab_portfolio")}
                </button>
              ))}
            </div>

            {activeTab === "portfolio" && (
              <div className="space-y-4">
                {portfolios.length === 0 ? (
                  <div className="card border-dashed border-white/10 text-center py-12">
                    <p className="text-white/40 text-sm mb-4">{t("dash_empty")}</p>
                    <Link href="/indexes" className="btn-primary inline-flex items-center gap-2">
                      <BarChart3 size={16} /> {t("dash_browse")}
                    </Link>
                  </div>
                ) : (
                  <>
                    {portfolios.map((p) => (
                      <div key={p.index_id} className={`card border-l-4 ${THEME_BORDER[p.theme] ?? "border-l-white/10"} hover:border-white/10 transition-all`}>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`badge border text-xs ${THEME_BADGE[p.theme] ?? ""}`}>
                                {p.theme === "ai-crypto" ? "AI × Crypto" : p.theme.toUpperCase()}
                              </span>
                              <span className="text-xs text-white/30">{p.days_invested} {t("dash_days_invested")}</span>
                            </div>
                            <Link href={`/indexes/${p.index_id}`} className="font-semibold text-white hover:text-brand-blue transition-colors">
                              {p.index_name}
                            </Link>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                            <div>
                              <p className="stat-label text-xs">Value</p>
                              <p className="font-semibold text-white">{fmtUSD(p.current_value_usd)}</p>
                            </div>
                            <div>
                              <p className="stat-label text-xs">P&L</p>
                              <p className={`font-semibold flex items-center gap-1 ${p.all_time_return_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {p.all_time_return_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {fmtPct(p.all_time_return_pct)}
                              </p>
                            </div>
                            <div>
                              <p className="stat-label text-xs">30d</p>
                              <p className={`font-semibold ${p.return_30d_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {fmtPct(p.return_30d_pct)}
                              </p>
                            </div>
                            <div>
                              <p className="stat-label text-xs">HWM</p>
                              <p className="font-semibold text-white">{fmtUSD(p.high_water_mark_usd)}</p>
                              <p className="text-xs text-white/30">Fee: {fmtUSD(p.accrued_performance_fee_usd)}</p>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center">
                            <WithdrawButton
                              indexId={p.index_id}
                              indexName={p.index_name}
                              currentValueUsd={p.current_value_usd}
                              depositedUsd={p.deposited_usd}
                              navUsd={1}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="card border-dashed border-white/10 text-center py-8">
                      <p className="text-white/40 text-sm mb-3">{t("dash_add_another")}</p>
                      <Link href="/indexes" className="btn-primary inline-flex items-center gap-2">
                        <BarChart3 size={16} /> Browse Indexes
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "performance" && (
              <div className="space-y-4">
                {portfolios.length === 0 ? (
                  <div className="card text-center py-12 border-dashed border-white/10">
                    <p className="text-white/40 text-sm mb-4">No investments yet — performance chart will appear after your first deposit.</p>
                    <Link href="/indexes" className="btn-primary inline-flex items-center gap-2">
                      <BarChart3 size={16} /> Browse Indexes
                    </Link>
                  </div>
                ) : (
                  <>
                    {portfolios.length > 1 && (
                      <div className="flex gap-2 flex-wrap">
                        {portfolios.map((p) => (
                          <button
                            key={p.index_id}
                            onClick={() => setSelectedIndexForPerf(p.index_id)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                              selectedIndexForPerf === p.index_id
                                ? "border-brand-blue bg-brand-blue/10 text-white"
                                : "border-white/10 text-white/40 hover:text-white"
                            }`}
                          >
                            {p.index_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedIndexForPerf && (
                      <PerformancePanel
                        indexId={selectedIndexForPerf}
                        walletAddress={address}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Bot size={16} className="text-brand-blue" />
                  <h2 className="font-semibold text-white">AI Agent Activity Log</h2>
                  <span className="badge badge-blue ml-auto">Live</span>
                </div>
                <AgentActivityFeed activities={activities} maxItems={20} />
              </div>
            )}

            {activeTab === "macro" && macro && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-yellow-400" />
                    <h2 className="font-semibold text-white">Macro Context</h2>
                  </div>
                  <MacroWidget macro={macro} />
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw size={16} className="text-brand-blue" />
                    <h2 className="font-semibold text-white">AI Risk Status</h2>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Sentiment Override", desc: `Triggered below score 25. Current: ${macro.sosovalue_sentiment_score}.`, ok: macro.sosovalue_sentiment_score > 25 },
                      { label: "Capitulation Override", desc: "Triggered below score 15. 30% USDC buffer.", ok: macro.sosovalue_sentiment_score > 15 },
                      { label: "Token Ejection Monitor", desc: "Monitoring all positions for >40% 7d drop.", ok: true },
                      { label: "Liquidity Check", desc: "All positions above $500K 24h volume threshold.", ok: true },
                      { label: "Drift Monitor", desc: "Next rebalance if >5% drift from target weight.", ok: true },
                    ].map((r) => (
                      <div key={r.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/3">
                        <span className={`text-xs font-medium mt-0.5 ${r.ok ? "text-green-400" : "text-red-400"}`}>{r.ok ? "✓" : "✗"}</span>
                        <div>
                          <p className="text-sm text-white/70 font-medium">{r.label}</p>
                          <p className="text-xs text-white/30 mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
