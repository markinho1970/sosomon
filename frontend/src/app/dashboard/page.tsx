"use client";

import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { useRouter } from "next/navigation";
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
  const r = parseFloat(v.toFixed(2));
  if (r === 0) return "0.00%";
  return `${r > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function fmtChange(v: number, decimals = 1): string {
  const r = parseFloat(v.toFixed(decimals));
  if (r === 0) return `0.${"0".repeat(decimals)}%`;
  return `${r > 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}
function pctColor(v: number, decimals = 1, zeroClass = "text-white/50"): string {
  if (parseFloat(v.toFixed(decimals)) === 0) return zeroClass;
  return v > 0 ? "text-green-400" : "text-red-400";
}

interface Portfolio {
  index_id: string;
  index_name: string;
  theme: string;
  deposited_usd: number;
  current_value_usd: number;
  index_tokens_held: number;
  all_time_return_pct: number;
  return_7d_pct: number;
  return_30d_pct: number;
  btc_benchmark_30d: number;
  high_water_mark_usd: number;
  days_invested: number;
  accrued_performance_fee_usd: number;
}

interface TokenHolding {
  symbol: string; name: string; weight: number;
  usd_value: number; quantity: number; price: number;
  change_7d: number; change_30d: number;
}
interface BreakdownIndex { index_id: string; index_name: string; total_value: number; tokens: TokenHolding[]; }
interface HistoryPoint { date: string; value: number; deposited: number; nav?: number; }
interface HistoryIndex {
  index_id: string; index_name: string; theme: string;
  current_value: number; deposited: number;
  return_7d_pct: number; return_30d_pct: number; btc_benchmark_30d: number;
  points: HistoryPoint[];
}
interface Transaction { type: "deposit"|"withdrawal"; index_id: string; amount_usd: number; net_usd?: number; tx_hash: string; timestamp: string; status: string; }

export default function DashboardPage() {
  const { address, isConnected, status } = useAccount();
  const { networkMode, isTestnet, networkModeLoaded } = useNetworkMode();
  const { t } = useLang();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance" | "activity" | "macro">("portfolio");
  const [selectedIndexForPerf, setSelectedIndexForPerf] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [subscriber, setSubscriber] = useState<{ is_pro: boolean; days_streak: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refundNotices, setRefundNotices] = useState<Array<{amount_usd: number; minimum_usd: number; tx_hash: string}>>([]);
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);
  const [pendingWalletChange, setPendingWalletChange] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownIndex[]>([]);
  const [history, setHistory] = useState<HistoryIndex[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastPriceCheck, setLastPriceCheck] = useState<Date | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  // { symbol: 'up' | 'down' } — tokens com valor em flash momentâneo
  const [flashed, setFlashed] = useState<Record<string, "up" | "down">>({});
  // Ref para o breakdown atual sem ser dependência do interval
  const breakdownRef = useRef<BreakdownIndex[]>([]);
  // Garante que wagmi já viu pelo menos um estado "connected" antes de redirecionar no F5
  const seenConnected = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Mantém ref do breakdown sempre atual (evita re-criar o interval a cada mudança)
  useEffect(() => { breakdownRef.current = breakdown; }, [breakdown]);

  // Polling de preços ao vivo a cada 5s — atualiza só os valores que mudaram
  useEffect(() => {
    if (!viewingAddress) return;
    const poll = async () => {
      if (!breakdownRef.current.length) return;
      try {
        const { prices } = await investApi.getLivePrices(networkMode);
        if (!prices || !Object.keys(prices).length) return;

        const newFlash: Record<string, "up" | "down"> = {};
        let anyChange = false;

        // Normaliza símbolo para buscar no mapa de preços:
        // "vDEFI.ssi" → strip 'v' → "DEFI.ssi" → remove '.' → "DEFIssi"
        const normSym = (sym: string) => (sym.startsWith("v") ? sym.slice(1) : sym).replace(/\./g, "");

        setBreakdown(prev => prev.map(b => {
          let indexChanged = false;
          const newTokens = b.tokens.map(tok => {
            const newPrice = prices[normSym(tok.symbol)]; // ex: prices["AAVE"] = 97.5
            if (!newPrice || newPrice <= 0) return tok;
            // Ignora mudanças abaixo de 0.01% (ruído de arredondamento)
            if (Math.abs(newPrice - tok.price) / tok.price < 0.0001) return tok;
            const dir = newPrice > tok.price ? "up" : "down";
            newFlash[tok.symbol] = dir;
            anyChange = true;
            indexChanged = true;
            const newUsd = Math.round(tok.quantity * newPrice * 100) / 100;
            return { ...tok, price: newPrice, usd_value: newUsd };
          });
          if (!indexChanged) return b;
          const newTotal = Math.round(newTokens.reduce((s, t) => s + t.usd_value, 0) * 100) / 100;
          return { ...b, tokens: newTokens, total_value: newTotal };
        }));

        if (anyChange) {
          setFlashed(newFlash);
          setTimeout(() => setFlashed({}), 800);
        }

        setLastPriceCheck(new Date());
        setSecondsSince(0);
      } catch { /**/ }
    };

    poll(); // primeira verificação imediata
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, [viewingAddress, networkMode]);

  // Contador "checked X ago"
  useEffect(() => {
    const id = setInterval(() => setSecondsSince(s => s + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status === "connected") seenConnected.current = true;
  }, [status]);

  // Redireciona para home só quando realmente desconectado (não durante reconexão do F5)
  useEffect(() => {
    if (!mounted) return;
    if (status === "reconnecting" || status === "connecting") return;
    if (!isConnected) {
      if (!seenConnected.current) return; // aguarda wagmi confirmar a reconexão
      router.replace("/");
    }
  }, [mounted, isConnected, status, router]);

  // Efeito 1: detecta desconexao e troca de conta no MetaMask
  useEffect(() => {
    if (!address) {
      setViewingAddress(null);
      setPendingWalletChange(null);
      setPortfolios([]);
      setSubscriber(null);
      setRefundNotices([]);
      return;
    }
    setViewingAddress(prev => {
      if (!prev) return address;
      if (prev !== address) {
        setPendingWalletChange(address);
        return prev;
      }
      return prev;
    });
  }, [address]);

  // Efeito 2: busca dados quando a carteira visualizada muda
  useEffect(() => {
    if (!viewingAddress || !networkModeLoaded) return;
    setPortfolios([]);
    setSubscriber(null);
    setRefundNotices([]);
    setBreakdown([]);
    setHistory([]);
    setTransactions([]);
    let cancelled = false;
    setLoading(true);

    // allSettled: falha individual não derruba os outros dados
    Promise.allSettled([
      investApi.getPortfolio(viewingAddress, networkMode),
      agentApi.getRecentActivity(20),
      macroApi.get(),
      investApi.getRefunds(viewingAddress, networkMode),
      investApi.getBreakdown(viewingAddress, networkMode),
      investApi.getHistory(viewingAddress, networkMode, 30),
      investApi.getTransactions(viewingAddress, networkMode),
    ]).then((results) => {
      if (cancelled) return;
      const ok = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? r.value : null;
      const [portfolioData, activityData, macroData, refundsData, bkd, hist, txs] = results.map(ok);
      if (portfolioData) {
        setPortfolios(portfolioData.portfolios ?? []);
        setSubscriber(portfolioData.subscriber ?? null);
      }
      if (activityData)  setActivities(activityData ?? []);
      if (macroData)     setMacro(macroData);
      if (refundsData)   setRefundNotices(refundsData ?? []);
      if (bkd)           setBreakdown(bkd);
      if (hist)          setHistory(hist);
      if (txs)           setTransactions(txs);

      // Log falhas para debug sem quebrar a UI
      results.forEach((r, i) => {
        if (r.status === "rejected") console.warn(`Dashboard fetch[${i}] failed:`, r.reason);
      });
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
        setLastPriceCheck(new Date());
        setSecondsSince(0);
      }
    });

    return () => { cancelled = true; };
  }, [viewingAddress, networkMode, networkModeLoaded, refreshToken]);

  const totalValue = portfolios.reduce((s, p) => s + p.current_value_usd, 0);
  const totalDeposited = portfolios.reduce((s, p) => s + p.deposited_usd, 0);
  const totalReturnPct = totalDeposited > 0 ? ((totalValue - totalDeposited) / totalDeposited) * 100 : 0;
  const totalFees = portfolios.reduce((s, p) => s + p.accrued_performance_fee_usd, 0);

  if (!mounted || status === "reconnecting" || status === "connecting") return null;
  if (!isConnected) return null;

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

        {pendingWalletChange && (
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-sky-300">{t("dash_wallet_changed")}</p>
              <p className="text-xs text-sky-400/70 mt-0.5">
                {t("dash_active_wallet")} <span className="font-mono">{pendingWalletChange.slice(0,6)}…{pendingWalletChange.slice(-4)}</span>
                {"· "}{t("dash_viewing_wallet")} <span className="font-mono">{viewingAddress?.slice(0,6)}…{viewingAddress?.slice(-4)}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setViewingAddress(pendingWalletChange); setPendingWalletChange(null); }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-semibold transition-all"
              >
                {t("dash_switch_to").replace("{a}", pendingWalletChange.slice(0,6))}
              </button>
              <button
                onClick={() => setPendingWalletChange(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium transition-all"
              >
                {t("dash_stay_on").replace("{a}", viewingAddress?.slice(0,6) ?? "")}
              </button>
            </div>
          </div>
        )}


        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{t("dash_title")}</h1>
            <p className="text-white/40 text-sm">
              {t("dash_connected")} <span className="font-mono text-white/60">{viewingAddress?.slice(0, 6)}…{viewingAddress?.slice(-4)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(subscriber?.days_streak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <Award size={12} />
                {t("dash_day_streak").replace("{n}", String(subscriber!.days_streak))}
              </div>
            )}
            {subscriber?.is_pro && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-medium">
                <Zap size={12} />
                {t("dash_pro_member")}
              </div>
            )}
            <button
              onClick={() => setRefreshToken(n => n + 1)}
              title="Forçar atualização completa dos dados"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/70 text-xs transition-all"
            >
              {loading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
              <span>
                {loading
                  ? "updating…"
                  : lastPriceCheck
                  ? `${Math.min(secondsSince, 5)}s`
                  : "live"}
              </span>
            </button>
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
                <p className={parseFloat(totalReturnPct.toFixed(2)) === 0 ? "text-white/40 text-xs" : totalReturnPct > 0 ? "stat-change-positive" : "stat-change-negative"}>
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
                    <p className={`stat-value ${w30d === null ? "text-white/30" : pctColor(w30d, 2, "text-white")}`}>
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
                    {/* ── Alertas de performance semanal ─────────────────────────── */}
                    {portfolios.filter(p => Math.abs(p.return_7d_pct ?? 0) >= 3).map(p => {
                      const r7 = p.return_7d_pct ?? 0;
                      const up = r7 > 0;
                      return (
                        <div key={`alert-${p.index_id}`} className={`rounded-xl border px-4 py-3 flex items-center gap-3 mb-1 ${
                          up
                            ? "border-green-500/30 bg-green-500/8 text-green-300"
                            : r7 < -10
                            ? "border-red-500/40 bg-red-500/10 text-red-300"
                            : "border-yellow-500/30 bg-yellow-500/8 text-yellow-300"
                        }`}>
                          <span className="text-lg">{up ? "🚀" : r7 < -10 ? "⚠️" : "📉"}</span>
                          <div className="flex-1">
                            <span className="font-semibold text-sm">{p.index_name}</span>
                            <span className="text-xs ml-2 opacity-80">
                              {up ? "subiu" : "caiu"} <strong>{Math.abs(r7).toFixed(2)}%</strong> esta semana
                              {p.btc_benchmark_30d !== 0 && (
                                <span className="opacity-60 ml-2">· BTC 30d: {p.btc_benchmark_30d > 0 ? "+" : ""}{p.btc_benchmark_30d.toFixed(2)}%</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}

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
                              <p className={`font-semibold flex items-center gap-1 ${pctColor(p.all_time_return_pct, 2, "text-white")}`}>
                                {parseFloat(p.all_time_return_pct.toFixed(2)) > 0 ? <TrendingUp size={13} /> : parseFloat(p.all_time_return_pct.toFixed(2)) < 0 ? <TrendingDown size={13} /> : null}
                                {fmtPct(p.all_time_return_pct)}
                              </p>
                            </div>
                            <div>
                              <p className="stat-label text-xs">30d</p>
                              <p className={`font-semibold ${pctColor(p.return_30d_pct, 2, "text-white")}`}>
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
                        <BarChart3 size={16} /> {t("dash_browse")}
                      </Link>
                    </div>
                    {breakdown.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">{t("dash_token_holdings")}</h3>
                        {breakdown.map(b => (
                          <div key={b.index_id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-4">
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                              <span className="text-white text-sm font-medium">{b.index_name}</span>
                              <span className="text-white/60 text-xs">{fmtUSD(b.total_value)}</span>
                            </div>
                            <div className="divide-y divide-white/5">
                              {b.tokens.map(tok => {
                                const flashDir = flashed[tok.symbol];
                                return (
                                  <div key={tok.symbol} className="px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <span className="text-white/70 text-xs font-bold">{tok.symbol.replace("v","").slice(0,3)}</span>
                                      </div>
                                      <div>
                                        <p className="text-white text-sm font-medium">{tok.symbol.startsWith("v") ? tok.symbol.slice(1) : tok.symbol}</p>
                                        <p className="text-white/40 text-xs">
                                          {tok.quantity.toFixed(4)} @ $
                                          <span className={`transition-colors duration-500 ${flashDir === "up" ? "text-green-300" : flashDir === "down" ? "text-red-300" : "text-white/40"}`}>
                                            {tok.price < 1 ? tok.price.toFixed(4) : tok.price.toFixed(2)}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-sm font-semibold transition-colors duration-500 ${flashDir === "up" ? "text-green-300" : flashDir === "down" ? "text-red-300" : "text-white"}`}>
                                        {fmtUSD(tok.usd_value)}
                                      </p>
                                      <p className={`text-xs ${pctColor(tok.change_7d, 1)}`}>
                                        {fmtChange(tok.change_7d, 1)} 7d
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {transactions.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">{t("dash_transaction_history")}</h3>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                          <div className="divide-y divide-white/5">
                            {transactions.map((tx, i) => (
                              <div key={i} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "deposit" ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                                    <span className={`text-xs font-bold ${tx.type === "deposit" ? "text-green-400" : "text-orange-400"}`}>
                                      {tx.type === "deposit" ? "↓" : "↑"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                                    <p className="text-white/40 text-xs">{tx.index_id?.replace(/-/g, " ")} · {new Date(tx.timestamp).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-medium ${tx.type === "deposit" ? "text-green-400" : "text-orange-400"}`}>
                                    {tx.type === "deposit" ? "+" : "-"}{fmtUSD(tx.amount_usd)}
                                  </p>
                                  {tx.tx_hash && (
                                    <p className="text-white/30 text-xs truncate max-w-[120px]">{tx.tx_hash.slice(0,10)}...</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "performance" && (
              <div className="space-y-6">
                {history.length === 0 ? (
                  <div className="text-center text-white/40 py-16">No performance data yet — chart fills in hourly.</div>
                ) : history.map(h => {
                  // Normaliza NAV para % de retorno desde o primeiro snapshot
                  const navPoints = h.points.filter(p => p.nav && p.nav > 0);
                  const navBase = navPoints.length > 0 ? navPoints[0].nav! : null;
                  const navChartData = navPoints.map(p => ({
                    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    nav_pct: navBase && navBase > 0 ? parseFloat(((p.nav! - navBase) / navBase * 100).toFixed(2)) : 0,
                    value: p.value,
                    deposited: p.deposited,
                  }));

                  // Se não há pontos de NAV, usa dados de valor absoluto
                  const useNav = navChartData.length > 1;
                  const absChartData = h.points.map(p => ({
                    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    value: p.value,
                    deposited: p.deposited,
                  }));

                  const pnl = h.current_value - h.deposited;
                  const pnlPct = h.deposited > 0 ? (pnl / h.deposited * 100) : 0;
                  const btc30d = h.btc_benchmark_30d ?? 0;
                  const r7d = h.return_7d_pct ?? 0;
                  const r30d = h.return_30d_pct ?? 0;

                  return (
                    <div key={h.index_id} className="bg-white/5 rounded-xl p-5 border border-white/10">
                      {/* Header com métricas */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                        <div>
                          <p className="text-white font-semibold text-base mb-1">{h.index_name}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-sm font-medium ${pctColor(pnlPct, 2, "text-white")}`}>
                              {fmtUSD(pnl)} ({fmtPct(pnlPct)}) all-time
                            </span>
                            <span className="text-white/20">·</span>
                            <span className={`text-xs ${pctColor(r7d, 1)}`}>{fmtChange(r7d, 1)} 7d</span>
                            <span className={`text-xs ${pctColor(r30d, 1)}`}>{fmtChange(r30d, 1)} 30d</span>
                          </div>
                        </div>
                        <div className="flex gap-4 shrink-0 text-right">
                          <div>
                            <p className="text-white font-bold text-lg">{fmtUSD(h.current_value)}</p>
                            <p className="text-white/40 text-xs">current value</p>
                          </div>
                          {btc30d !== 0 && (
                            <div className="border-l border-white/10 pl-4">
                              <p className={`font-semibold text-sm ${pctColor(btc30d, 1)}`}>{fmtChange(btc30d, 1)}</p>
                              <p className="text-white/30 text-xs">BTC 30d</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gráfico NAV % (principal) */}
                      {useNav ? (
                        <>
                          <p className="text-white/40 text-xs mb-2 uppercase tracking-widest">NAV Return % since inception</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={navChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} width={52} />
                              <Tooltip
                                contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                                formatter={(v: number, name: string) => [
                                  name === "nav_pct" ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : `$${v.toFixed(2)}`,
                                  name === "nav_pct" ? "NAV return" : name,
                                ]}
                              />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                              {btc30d !== 0 && (
                                <ReferenceLine
                                  y={btc30d}
                                  stroke="#f59e0b"
                                  strokeDasharray="6 3"
                                  strokeWidth={1.5}
                                  label={{ value: `BTC 30d ${btc30d > 0 ? "+" : ""}${btc30d.toFixed(1)}%`, fill: "#f59e0b", fontSize: 10, position: "right" }}
                                />
                              )}
                              <Line type="monotone" dataKey="nav_pct" stroke="#f97316" strokeWidth={2} dot={false} name="nav_pct" />
                            </LineChart>
                          </ResponsiveContainer>
                        </>
                      ) : (
                        <>
                          <p className="text-white/40 text-xs mb-2 uppercase tracking-widest">Portfolio Value (USD)</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={absChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`grad-${h.index_id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={48} />
                              <Tooltip
                                contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                                formatter={(v: number) => [`$${v.toFixed(2)}`, ""]}
                              />
                              <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill={`url(#grad-${h.index_id})`} dot={false} name="Value" />
                              <Area type="monotone" dataKey="deposited" stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 4" fill="none" dot={false} name="Invested" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      )}

                      {navChartData.length <= 1 && (
                        <p className="text-white/30 text-xs text-center mt-2">Chart accumulates hourly — check back later for the full curve.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Bot size={16} className="text-brand-blue" />
                  <h2 className="font-semibold text-white">{t("dash_activity_title")}</h2>
                  <span className="badge badge-blue ml-auto">{t("dash_live_badge")}</span>
                </div>
                <AgentActivityFeed activities={activities} maxItems={20} />
              </div>
            )}

            {activeTab === "macro" && macro && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-yellow-400" />
                    <h2 className="font-semibold text-white">{t("dash_macro_title")}</h2>
                  </div>
                  <MacroWidget macro={macro} />
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw size={16} className="text-brand-blue" />
                    <h2 className="font-semibold text-white">{t("dash_risk_status_title")}</h2>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: t("dash_risk_sentiment_override"), desc: t("dash_risk_sentiment_desc").replace("{score}", String(macro.sosovalue_sentiment_score)), ok: macro.sosovalue_sentiment_score > 25 },
                      { label: t("dash_risk_cap_override"), desc: t("dash_risk_cap_desc"), ok: macro.sosovalue_sentiment_score > 15 },
                      { label: t("dash_risk_ejection_monitor"), desc: t("dash_risk_ejection_desc"), ok: true },
                      { label: t("dash_risk_liquidity"), desc: t("dash_risk_liquidity_desc"), ok: true },
                      { label: t("dash_risk_drift"), desc: t("dash_risk_drift_desc"), ok: true },
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
