"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, RefreshCw, TrendingUp, Info, Copy, CheckCircle2, ExternalLink, ShieldAlert, Activity, LayoutList, X } from "lucide-react";
import Navbar from "../../components/Navbar";
import InvestButton from "../../components/InvestButton";
import { indexApi, investApi } from "@/lib/api";
import { useLang } from "@/lib/LanguageContext";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { INDEX_I18N } from "@/lib/i18n/translations";
import type { AlphaIndex, IndexRiskData } from "@/types";

const THEME_HEADER: Record<string, string> = {
  "ai-crypto": "from-purple-900/30 to-transparent",
  rwa: "from-emerald-900/30 to-transparent",
  depin: "from-cyan-900/30 to-transparent",
};

const THEME_BADGE: Record<string, string> = {
  "ai-crypto": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  rwa: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  depin: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

const THEME_LABELS: Record<string, string> = {
  "ai-crypto": "AI × Crypto",
  rwa: "Real World Assets",
  depin: "DePIN",
};

function fmt(v: number, compact = false) {
  if (compact) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
}

function FundWalletBox({ t, networkMode }: { t: (key: string) => string; networkMode: "mainnet" | "testnet" }) {
  const [wallet, setWallet] = useState<{ address: string | null; usdc_balance: number | null; configured: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    investApi.getFundWallet(networkMode).then(setWallet).catch(() => {});
  }, [networkMode]);

  function copyAddress() {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!wallet?.configured || !wallet.address) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t("idx_fund_wallet")}</p>
      <div className="bg-white/3 rounded-lg p-3 space-y-2">
        <p className="text-xs text-white/40 leading-relaxed">
          {t("idx_send_instr")}
        </p>
        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
          <span className="font-mono text-xs text-white/70 flex-1 truncate">{wallet.address}</span>
          <button
            onClick={copyAddress}
            className="shrink-0 text-white/30 hover:text-white transition-colors"
            title="Copy address"
          >
            {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/30">{t("idx_usdc_balance")}</span>
          <span className="text-white font-medium">
            {wallet.usdc_balance !== null ? `$${wallet.usdc_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
          </span>
        </div>
        <a
          href={`https://${networkMode === "testnet" ? "sepolia." : ""}basescan.org/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-brand-orange hover:text-orange-300 transition-colors"
        >
          View on Basescan <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

export default function IndexDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { t, lang } = useLang();
  const { networkMode } = useNetworkMode();

  const [idx, setIdx] = useState<AlphaIndex | null>(null);
  const [risk, setRisk] = useState<IndexRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showBasket, setShowBasket] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    setIdx(null);
    setRisk(null);
    Promise.all([
      indexApi.getBySlug(slug, networkMode),
      indexApi.getRisk(slug, networkMode).catch(() => null),
    ])
      .then(([idxData, riskData]) => { setIdx(idxData); setRisk(riskData); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, networkMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Navbar />
        <RefreshCw size={24} className="text-white/20 animate-spin" />
      </div>
    );
  }

  if (error || !idx) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-white/40 mb-4">{t("idx_not_found")}</p>
          <Link href="/indexes" className="btn-ghost">{t("idx_back")}</Link>
        </div>
      </div>
    );
  }

  const alphaBTC = (idx.return_30d_pct ?? 0) - (idx.btc_benchmark_30d ?? 0);
  const idxName = INDEX_I18N[idx.slug ?? idx.id]?.[lang]?.name ?? idx.name;
  const idxDesc = INDEX_I18N[idx.slug ?? idx.id]?.[lang]?.description ?? idx.description;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* Header */}
      <div className={`bg-gradient-to-b ${THEME_HEADER[idx.theme] ?? "from-white/5 to-transparent"} pt-32 pb-8 px-4`}>
        <div className="max-w-7xl mx-auto">
          <Link href="/indexes" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white mb-4 transition-colors w-fit">
            <ArrowLeft size={14} /> {t("idx_back")}
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <span className={`badge text-xs mb-3 inline-flex ${THEME_BADGE[idx.theme] ?? "bg-white/10 text-white/60"}`}>
                {THEME_LABELS[idx.theme] ?? idx.theme}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{idxName}</h1>
              <p className="text-white/50 max-w-xl">{idxDesc}</p>
            </div>
            <div className="flex gap-3">
              <Link href="#invest" className="btn-primary">{t("idx_invest")}</Link>
              <Link href="/dashboard" className="btn-ghost">{t("nav_dashboard")}</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: t("idx_aum"),     value: fmt(idx.aum_usd ?? 0, true), neutral: true },
            { label: t("idx_nav_token"), value: `$${(idx.nav_usd ?? 0).toFixed(3)}`, neutral: true },
            { label: t("idx_30d"),     value: (() => { const v = idx.return_30d_pct ?? 0; const r = parseFloat(v.toFixed(1)); return `${r > 0 ? "+" : ""}${r === 0 ? "0.0" : v.toFixed(1)}%`; })(), sign: idx.return_30d_pct ?? 0 },
            { label: t("idx_btc"),     value: (() => { const r = parseFloat(alphaBTC.toFixed(1)); return `${r > 0 ? "+" : ""}${r === 0 ? "0.0" : alphaBTC.toFixed(1)}%`; })(), sign: alphaBTC },
            { label: t("idx_alltime"), value: (() => { const v = idx.total_return_pct ?? 0; const r = parseFloat(v.toFixed(1)); return `${r > 0 ? "+" : ""}${r === 0 ? "0.0" : v.toFixed(1)}%`; })(), sign: idx.total_return_pct ?? 0 },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p className={`text-xl font-bold ${
                s.neutral ? "text-white"
                : parseFloat((s.sign! ?? 0).toFixed(1)) > 0 ? "text-green-400"
                : parseFloat((s.sign! ?? 0).toFixed(1)) < 0 ? "text-red-400"
                : "text-white"
              }`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Constituents + Risk */}
          <div className="lg:col-span-2 space-y-6">
            {/* Composition card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">{t("idx_constituents")}</h2>
                {idx.last_rebalanced_at && (
                  <div className="flex items-center gap-1.5 text-xs text-white/30">
                    <RefreshCw size={11} />
                    {t("idx_last_rebalanced")} {new Date(idx.last_rebalanced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-3 px-3 mb-1 text-xs text-white/20 uppercase tracking-wider">
                <div className="w-28 shrink-0">{t("idx_col_token_weight")}</div>
                <div className="flex-1">{t("idx_col_asset")}</div>
                <div className="w-14 text-right shrink-0">7d</div>
                <div className="w-14 text-right shrink-0">30d</div>
                <div className="w-20 shrink-0 text-center">{t("idx_col_ejection_risk")}</div>
                <div className="w-4 shrink-0" />
              </div>

              <div className="space-y-1">
                {idx.constituents?.map((token) => {
                  const inBasket = token.in_basket !== false;
                  const ejRisk = inBasket ? (token.ejection_risk_pct ?? 0) : 0;
                  const ejColor = ejRisk >= 75 ? "bg-red-500" : ejRisk >= 50 ? "bg-orange-400" : ejRisk >= 25 ? "bg-yellow-400" : "bg-green-500/60";
                  return (
                    <div key={`${token.symbol}-${inBasket}`} className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${inBasket ? "hover:bg-white/3" : "opacity-50 hover:opacity-70"}`}>
                      {/* Symbol + weight bar */}
                      <div className="w-28 shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-mono ${inBasket ? "text-white/70" : "text-white/40"}`}>{token.symbol}</span>
                          {inBasket ? (
                            <span className="text-xs text-white/40">{token.weight}%</span>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          {inBasket && <div className="h-full bg-brand-blue/60 rounded-full" style={{ width: `${Math.min((token.weight / 40) * 100, 100)}%` }} />}
                        </div>
                      </div>

                      {/* Name + price */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm truncate ${inBasket ? "text-white/70" : "text-white/35"}`}>{token.name}</p>
                          {!inBasket && <span className="text-[9px] px-1 py-0.5 rounded border border-white/10 text-white/25 shrink-0">candidate</span>}
                        </div>
                        <p className="text-xs text-white/30">{fmt(token.current_price_usd ?? 0)}</p>
                      </div>

                      {/* 7d */}
                      <div className={`w-14 text-right text-sm font-medium shrink-0 ${(token.price_change_7d ?? 0) > 0 ? "text-green-400" : (token.price_change_7d ?? 0) < 0 ? "text-red-400" : "text-white"}`}>
                        {(token.price_change_7d ?? 0) > 0 ? "+" : ""}{(token.price_change_7d ?? 0).toFixed(1)}%
                      </div>

                      {/* 30d */}
                      <div className={`w-14 text-right text-xs shrink-0 ${(token.price_change_30d ?? 0) > 0 ? "text-green-400/70" : (token.price_change_30d ?? 0) < 0 ? "text-red-400/70" : "text-white/40"}`}>
                        {(token.price_change_30d ?? 0) > 0 ? "+" : ""}{(token.price_change_30d ?? 0).toFixed(1)}%
                      </div>

                      {/* Ejection risk bar — só para tokens da cesta */}
                      <div className="w-20 shrink-0">
                        {inBasket ? (
                          <>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-white/20">{ejRisk.toFixed(0)}%</span>
                              {ejRisk >= 50 && <ShieldAlert size={10} className="text-orange-400" />}
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${ejColor}`} style={{ width: `${Math.min(ejRisk, 100)}%` }} />
                            </div>
                          </>
                        ) : (
                          <div className="h-1.5 bg-white/3 rounded-full" />
                        )}
                      </div>

                      {/* Rationale tooltip */}
                      {token.ai_rationale && (
                        <div className="relative group/tip w-4 shrink-0">
                          <Info size={13} className="text-white/20 hover:text-white/50 cursor-help transition-colors" />
                          <div className="absolute right-0 top-6 w-72 bg-brand-gray border border-white/10 rounded-lg p-3 z-10 hidden group-hover/tip:block shadow-xl space-y-2">
                            <p className="text-xs text-white/50 leading-relaxed">{token.ai_rationale}</p>
                            <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-1 text-xs">
                              <div>
                                <span className="text-white/20">{t("idx_tooltip_7d")}</span>
                                <p className={`font-medium ${(token.price_change_7d ?? 0) > 0 ? "text-green-400" : (token.price_change_7d ?? 0) < 0 ? "text-red-400" : "text-white"}`}>
                                  {(token.price_change_7d ?? 0) > 0 ? "+" : ""}{(token.price_change_7d ?? 0).toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-white/20">{t("idx_tooltip_30d")}</span>
                                <p className={`font-medium ${(token.price_change_30d ?? 0) > 0 ? "text-green-400" : (token.price_change_30d ?? 0) < 0 ? "text-red-400" : "text-white"}`}>
                                  {(token.price_change_30d ?? 0) > 0 ? "+" : ""}{(token.price_change_30d ?? 0).toFixed(2)}%
                                </p>
                              </div>
                              {inBasket && (
                                <>
                                  <div>
                                    <span className="text-white/20">{t("idx_weight")}</span>
                                    <p className="text-white font-medium">{token.weight}%</p>
                                  </div>
                                  <div>
                                    <span className="text-white/20">{t("idx_col_ejection_risk")}</span>
                                    <p className={`font-medium ${ejRisk >= 50 ? "text-orange-400" : "text-white/60"}`}>{ejRisk.toFixed(1)}% {t("idx_pct_of_threshold")}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {idx.rebalance_summary && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-1.5">{t("idx_last_rebalanced")}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{idx.rebalance_summary}</p>
                </div>
              )}
            </div>

            {/* Risk Controls card */}
            {risk && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert size={14} className="text-brand-orange" />
                  <h2 className="font-semibold text-white">{t("idx_risk_controls_title")}</h2>
                  <span className="ml-auto text-xs text-white/30">{t("idx_risk_controls_subtitle")}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {[
                    { label: t("idx_risk_ejection_threshold"), value: t("idx_risk_ejection_value"), note: t("idx_risk_ejection_note") },
                    { label: t("idx_risk_cooldown_label"), value: `${risk.risk_rules.ejection_cooldown_days}d`, note: t("idx_risk_cooldown_note") },
                    { label: t("idx_risk_max_weight_label"), value: `${risk.risk_rules.max_single_token_weight}%`, note: t("idx_risk_max_weight_note") },
                    { label: t("idx_risk_buffer_label"), value: `${(risk.stablecoin_buffer_pct ?? 0).toFixed(1)}%`, note: t("idx_risk_buffer_note") },
                  ].map((r) => (
                    <div key={r.label} className="bg-white/3 rounded-lg p-3">
                      <p className="text-xs text-white/30 mb-0.5">{r.label}</p>
                      <p className="text-sm font-medium text-white">{r.value}</p>
                      <p className="text-xs text-white/20 mt-0.5">{r.note}</p>
                    </div>
                  ))}
                </div>

                {/* Concentration risk — HHI gauge */}
                {risk.concentration && (
                  <div className="bg-white/3 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/30">Concentration Risk (HHI)</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        risk.concentration.level === "low"
                          ? "text-green-400 border-green-500/30 bg-green-500/8"
                          : risk.concentration.level === "medium"
                          ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/8"
                          : "text-red-400 border-red-500/30 bg-red-500/8"
                      }`}>
                        {risk.concentration.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                          risk.concentration.level === "low" ? "bg-green-500" :
                          risk.concentration.level === "medium" ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, risk.concentration.hhi * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/40">
                      <span>
                        HHI = <span className="text-white font-mono">{risk.concentration.hhi.toFixed(3)}</span>
                        <span className="ml-2 text-white/30">· n_efetivo: <span className="text-white font-mono">{risk.concentration.effective_n}</span></span>
                      </span>
                      <span className="text-white/30">
                        maior: <span className="text-white/60 font-mono">{risk.concentration.max_token}</span> {risk.concentration.max_weight_pct}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-white/3 rounded-lg p-3 mb-3">
                  <p className="text-xs text-white/30 mb-1.5">Sentiment-driven buffer triggers</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                      <span className="text-white/50">{t("idx_risk_sentiment_below")} {risk.risk_rules.buffer_trigger_low_pct}/100</span>
                      <span className="ml-auto text-white font-medium">{risk.risk_rules.buffer_low_allocation_pct}% {t("idx_risk_to_usdc")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <span className="text-white/50">{t("idx_risk_sentiment_below")} {risk.risk_rules.buffer_trigger_critical_pct}/100</span>
                      <span className="ml-auto text-white font-medium">{risk.risk_rules.buffer_critical_allocation_pct}% {t("idx_risk_to_usdc")}</span>
                    </div>
                  </div>
                </div>

                {(risk.cooldown_tokens || []).length > 0 && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-white/30 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      {t("idx_cooldown_tokens_title")} ({risk.cooldown_tokens.length})
                    </p>
                    <div className="space-y-1.5">
                      {risk.cooldown_tokens.map((ct) => (
                        <div key={ct.symbol} className="bg-red-500/5 border border-red-500/10 rounded px-3 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono font-semibold text-red-400 w-20 shrink-0">{ct.symbol}</span>
                          <span className="text-white/30 flex-1 truncate">{ct.reason.slice(0, 60)}</span>
                          <span className="text-white/50 shrink-0">{t("idx_cooldown_reentry").replace("{n}", String(ct.days_remaining))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {risk.last_proposal && (
                  <div className="pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={12} className="text-white/30" />
                      <p className="text-xs text-white/30">{t("idx_last_proposal_label")} · <span className="capitalize">{risk.last_proposal.trigger}</span> · <span className={`font-medium ${risk.last_proposal.status === "executed" ? "text-green-400" : risk.last_proposal.status === "pending" ? "text-yellow-400" : "text-white/40"}`}>{risk.last_proposal.status}</span></p>
                    </div>
                    <div className="space-y-1">
                      {(risk.last_proposal.changes || []).slice(0, 4).map((ch, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                          <span className={`w-12 shrink-0 font-mono font-medium ${ch.action === "add" ? "text-green-400" : ch.action === "remove" ? "text-red-400" : "text-yellow-400"}`}>
                            {ch.action === "add" ? "ADD" : ch.action === "remove" ? "REM" : "REWT"}
                          </span>
                          <span className="font-mono text-white/60">{ch.symbol}</span>
                          {ch.old_weight !== undefined && (
                            <span className="ml-auto shrink-0">{ch.old_weight}% → {ch.new_weight}%</span>
                          )}
                        </div>
                      ))}
                      {(risk.last_proposal.changes || []).length > 4 && (
                        <p className="text-xs text-white/20">{t("idx_more_changes").replace("{n}", String(risk.last_proposal.changes.length - 4))}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div id="invest" className="card border-brand-blue/20 bg-brand-blue/5">
              <h3 className="font-semibold text-white mb-1">{t("idx_invest")}</h3>
              <p className="text-xs text-white/40 mb-4">
                {t("idx_min_invest_prefix")} <span className="text-white font-semibold">${idx.min_deposit_usd ?? 50}</span> · {t("idx_receive")}
              </p>
              <div className="space-y-2 text-sm text-white/50 mb-4">
                <div className="flex justify-between">
                  <span>{t("idx_mgmt_fee")}</span>
                  <span className="text-white">{idx.management_fee_pct ?? 2}% /yr</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("idx_perf_fee")}</span>
                  <span className="text-white">20% on profits</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("idx_protocol")}</span>
                  <span className="text-white">SoSoValue ValueChain</span>
                </div>
              </div>
              <button
                onClick={() => setShowBasket(true)}
                className="w-full flex items-center justify-center gap-2 mb-3 px-4 py-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 text-white/60 hover:text-white text-sm transition-all"
              >
                <LayoutList size={14} />
                {t("idx_view_basket")}
                <span className="ml-auto text-xs text-white/30">{idx.constituents?.filter(c => c.in_basket !== false).length ?? 0} tokens</span>
              </button>
              <InvestButton indexId={idx.id} indexName={idxName} navUsd={idx.nav_usd ?? 1} minDepositUsd={idx.min_deposit_usd ?? 50} />
              <FundWalletBox t={t} networkMode={networkMode} />
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-white/40" />
                <p className="text-sm font-medium text-white">{idx.subscriber_count ?? 0} {t("idx_subscribers")}</p>
              </div>
              <p className="text-xs text-white/30">
                {idx.subscriber_count ?? 0} {t("idx_subscribers").toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basket Modal */}
      {showBasket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBasket(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-brand-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <h3 className="font-semibold text-white text-base">{idxName}</h3>
                <p className="text-xs text-white/30 mt-0.5">{t("idx_view_basket")} · {idx.constituents?.filter(c => c.in_basket !== false).length ?? 0} tokens · {t("idx_last_rebalanced")} {idx.last_rebalanced_at ? new Date(idx.last_rebalanced_at).toLocaleDateString() : "—"}</p>
              </div>
              <button onClick={() => setShowBasket(false)} className="text-white/30 hover:text-white transition-colors ml-4 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Token list — somente tokens da cesta */}
            <div className="px-3 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
              {(idx.constituents ?? []).filter(c => c.in_basket !== false).map((token) => {
                const ejRisk = token.ejection_risk_pct ?? 0;
                const ejColor = ejRisk >= 75 ? "bg-red-500" : ejRisk >= 50 ? "bg-orange-400" : ejRisk >= 25 ? "bg-yellow-400" : "bg-green-500/60";
                const ejLabel = ejRisk >= 75 ? "text-red-400" : ejRisk >= 50 ? "text-orange-400" : ejRisk >= 25 ? "text-yellow-400" : "text-green-400/70";
                return (
                  <div key={token.symbol} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/4 transition-colors">
                    {/* Symbol + weight */}
                    <div className="w-24 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono font-semibold text-white">{token.symbol}</span>
                        <span className="text-xs text-white/40">{token.weight}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-orange/50 rounded-full" style={{ width: `${Math.min((token.weight / 40) * 100, 100)}%` }} />
                      </div>
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 truncate">{token.name}</p>
                      <p className="text-xs text-white/25">{fmt(token.current_price_usd ?? 0)}</p>
                    </div>

                    {/* 7d */}
                    <div className={`text-xs font-medium w-12 text-right shrink-0 ${(token.price_change_7d ?? 0) > 0 ? "text-green-400" : (token.price_change_7d ?? 0) < 0 ? "text-red-400" : "text-white/40"}`}>
                      {(token.price_change_7d ?? 0) > 0 ? "+" : ""}{(token.price_change_7d ?? 0).toFixed(1)}%
                    </div>

                    {/* Ejection risk */}
                    <div className="w-16 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${ejLabel}`}>{ejRisk.toFixed(0)}%</span>
                        {ejRisk >= 50 && <ShieldAlert size={9} className="text-orange-400" />}
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ejColor}`} style={{ width: `${Math.min(ejRisk, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between text-xs text-white/30">
              <span>{t("idx_col_ejection_risk")}: % {t("idx_pct_of_threshold")} (−40% / 7d)</span>
              <span>{t("idx_risk_max_weight_label")}: 25%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
