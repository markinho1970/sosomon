"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useAccount, useSignMessage, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  CheckCircle2, XCircle, RefreshCw, Clock, BarChart3, Users,
  DollarSign, AlertTriangle, ShieldCheck, Play, Zap, Wallet, ArrowRightLeft,
  Fuel, ExternalLink, ChevronDown, Copy, Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { adminApi, type SystemAlert } from "@/lib/api";
import { useLang } from "@/lib/LanguageContext";
import { LANGUAGES, type Lang } from "@/lib/i18n/translations";

interface Proposal {
  id: number;
  index_id: string;
  index_name: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed" | "dry_run";
  trigger: string;
  proposed_at: string;
  approved_at: string | null;
  executed_at: string | null;
  changes: Array<{ symbol: string; old_weight: number; new_weight: number; action: string; rationale?: string }>;
  ai_rationale: string;
}

interface AdminStats {
  total_subscribers: number;
  pro_subscribers: number;
  total_aum_usd: number;
  pending_proposals: number;
  network_mode: string;
  indexes: Array<{ id: string; name: string; aum_usd: number; subscriber_count: number; return_30d_pct: number }>;
}

interface PortfolioPosition {
  asset: string;
  amount: number;
  usd_value: number;
  weight_pct: number;
}

interface Portfolio {
  positions: PortfolioPosition[];
  total_usd: number;
  network: string;
  wallet: string;
  configured: boolean;
}

interface Trade {
  id?: string;
  symbol?: string;
  side?: string;
  quantity?: string;
  price?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface Movement {
  id: string;
  type: "deposit" | "refund" | "withdrawal" | "manual" | "other";
  action: string;
  amount_usd: number;
  wallet: string;
  index_id: string;
  tx_hash: string;
  refund_tx: string;
  refund_ok: boolean | null;
  refund_basescan: string;
  basescan: string;
  manual_credit: boolean;
  reason: string;
  description: string;
  timestamp: string;
}

interface AuthSession {
  address: string;
  message: string;
  signature: string;
}

interface FundWalletInfo {
  address: string | null;
  usdc_balance: number | null;
  eth_balance: number | null;
  configured: boolean;
  network: string;
  chain_id: number;
  network_mode: string;
  usdc_contract: string;
  basescan_url: string;
}

const CHAIN_BASE_MAINNET = 8453;
const CHAIN_BASE_SEPOLIA = 84532;

const ADMIN_SESSION_KEY = "sosomon_admin_session";
const ADMIN_SESSION_MAX_AGE_S = 3600; // 1 hora

function fmtUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  executed: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  failed:   "bg-red-600/10 text-red-400 border-red-600/20",
  dry_run:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function AdminPage() {
  const { address, isConnected, status: wagmiStatus } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { t, lang, setLang } = useLang();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [signing, setSigning] = useState(false);

  // Selected network — controls ALL data on screen (persisted)
  const [networkMode, setNetworkMode] = useState<"mainnet" | "testnet">("mainnet");

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);
  const [fundWallet, setFundWallet] = useState<FundWalletInfo | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingFundWallet, setLoadingFundWallet] = useState(false);
  const [runningRebalancer, setRunningRebalancer] = useState(false);
  const [rebalancerMsg, setRebalancerMsg] = useState("");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [actionId, setActionId] = useState<number | null>(null);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [executeResult, setExecuteResult] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  const [copiedAddr, setCopiedAddr] = useState(false);
  const loadKeyRef = useRef("");

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertsCheckedAt, setAlertsCheckedAt] = useState("");

  // Restaura sessão E rede do localStorage de forma síncrona (antes do primeiro paint = sem flash)
  useLayoutEffect(() => {
    const savedNet = localStorage.getItem("sosomon_admin_network");
    if (savedNet === "testnet" || savedNet === "mainnet") setNetworkMode(savedNet);

    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AuthSession;
        const ts = parseInt(saved.message.split("ts:").pop()?.trim() ?? "0", 10);
        if (!isNaN(ts) && Date.now() / 1000 - ts < ADMIN_SESSION_MAX_AGE_S) {
          setSession(saved);
          setSessionChecked(true);
          return;
        }
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch { /**/ }
    setSessionChecked(true);
  }, []);

  // Quando wagmi confirma o endereço, verifica se bate com a sessão salva
  useEffect(() => {
    if (!address || !session) return;
    if (session.address.toLowerCase() !== address.toLowerCase()) expireSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Quando wagmi desconecta definitivamente (sem sessão no localStorage)
  useEffect(() => {
    if (wagmiStatus === "disconnected" && !localStorage.getItem(ADMIN_SESSION_KEY)) {
      setSession(null);
      setSessionChecked(true);
    }
  }, [wagmiStatus]);

  // Força Base Mainnet ao conectar — só para novas sessões (sem sessão salva)
  useEffect(() => {
    if (isConnected && !session && chainId !== CHAIN_BASE_MAINNET) {
      const hasStored = !!localStorage.getItem(ADMIN_SESSION_KEY);
      if (!hasStored) switchChain({ chainId: CHAIN_BASE_MAINNET });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, chainId]);

  // Força a rede correspondente ao trocar o toggle de ambiente
  useEffect(() => {
    if (!session) return;
    const requiredChain = networkMode === "mainnet" ? CHAIN_BASE_MAINNET : CHAIN_BASE_SEPOLIA;
    if (chainId !== requiredChain) {
      switchChain({ chainId: requiredChain });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMode, session]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function changeNetwork(mode: "mainnet" | "testnet") {
    loadKeyRef.current = ""; // força reload ao trocar rede manualmente
    setNetworkMode(mode);
    localStorage.setItem("sosomon_admin_network", mode);
    setReport(null);
    setShowReport(false);
  }

  function expireSession() {
    setSession(null);
    setAuthError("");
    setAccessDenied(false);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  async function handleSign() {
    if (!address) return;
    setSigning(true);
    setAuthError("");
    setAccessDenied(false);
    try {
      const ts = Math.floor(Date.now() / 1000);
      const message = `SoSoMon Admin Access | addr:${address} | ts:${ts}`;
      const signature = await signMessageAsync({ message });
      await adminApi.verifySignature(address, message, signature);
      const newSession = { address, message, signature };
      setSession(newSession);
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setAccessDenied(true);
      } else if (status === 401) {
        setAuthError(t("admin_sig_expired"));
      } else if ((e as { name?: string })?.name === "UserRejectedRequestError") {
        setAuthError(t("admin_sig_cancelled"));
      } else {
        setAuthError(t("admin_auth_error"));
      }
    } finally {
      setSigning(false);
    }
  }

  // Load all data for current network
  const loadAll = useCallback(async (net: "mainnet" | "testnet") => {
    if (!session) return;
    setLoading(true);
    setLoadingPortfolio(true);
    setLoadingTrades(true);
    setLoadingFundWallet(true);
    try {
      const [p, s, fw] = await Promise.all([
        adminApi.getProposals(session.address, session.message, session.signature),
        adminApi.getStats(session.address, session.message, session.signature, net),
        adminApi.getFundWallet(session.address, session.message, session.signature, net),
      ]);
      setProposals(p ?? []);
      setStats(s ?? null);
      setFundWallet(fw ?? null);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        expireSession(); // sessão expirada no backend → volta ao login
        return;
      }
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingFundWallet(false);
    }

    try {
      const port = await adminApi.getPortfolio(session.address, session.message, session.signature);
      setPortfolio(port);
    } catch { /* SoDEX may not be configured */ }
    finally { setLoadingPortfolio(false); }

    try {
      const tr = await adminApi.getTrades(session.address, session.message, session.signature, 20);
      setTrades(Array.isArray(tr) ? tr : []);
    } catch { /**/ }
    finally { setLoadingTrades(false); }

    setLoadingMovements(true);
    try {
      const mv = await adminApi.getMovements(session.address, session.message, session.signature, net);
      setMovements((mv?.movements ?? []) as Movement[]);
    } catch { /**/ }
    finally { setLoadingMovements(false); }
  }, [session]);

  // Carrega dados: dispara quando session ou networkMode muda, com deduplicação para evitar double-load
  useEffect(() => {
    if (!session) { loadKeyRef.current = ""; return; }
    const key = `${session.address}:${networkMode}`;
    if (loadKeyRef.current === key) return;
    loadKeyRef.current = key;
    loadAll(networkMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, networkMode]);

  const fetchAlerts = useCallback(async () => {
    if (!session) return;
    try {
      const data = await adminApi.alerts(session.address, session.message, session.signature);
      setAlerts(data.alerts ?? []);
      setAlertsCheckedAt(
        new Date(data.checked_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    } catch { /**/ }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchAlerts();
    const id = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleApprove(id: number) {
    if (!session) return;
    setActionId(id);
    try {
      await adminApi.approve(id, session.address, session.message, session.signature);
      await loadAll(networkMode);
    } finally { setActionId(null); }
  }

  async function handleReject(id: number) {
    if (!session) return;
    setActionId(id);
    try {
      await adminApi.reject(id, session.address, session.message, session.signature);
      await loadAll(networkMode);
    } finally { setActionId(null); }
  }

  async function handleExecute(id: number, dryRun: boolean) {
    if (!session) return;
    setExecutingId(id);
    setExecuteResult((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await adminApi.executeProposal(id, session.address, session.message, session.signature, dryRun);
      const label = dryRun ? "Dry run" : "Executed";
      setExecuteResult((prev) => ({
        ...prev,
        [id]: `${label}: ${res.orders_count ?? 0} orders ${dryRun ? "simulated" : "placed on SoDEX"}`,
      }));
      await loadAll(networkMode);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Execution failed";
      setExecuteResult((prev) => ({ ...prev, [id]: `Error: ${msg}` }));
    } finally { setExecutingId(null); }
  }

  async function handleReport() {
    if (!session) return;
    setLoadingReport(true);
    try {
      const r = await adminApi.getReport(session.address, session.message, session.signature, networkMode);
      setReport(r);
      setShowReport(true);
    } catch { /**/ }
    finally { setLoadingReport(false); }
  }

  async function handleRunRebalancer() {
    if (!session) return;
    setRunningRebalancer(true);
    setRebalancerMsg("");
    try {
      const res = await adminApi.runRebalancer(session.address, session.message, session.signature, false);
      setRebalancerMsg(`Rebalancer: ${res.pending_proposals ?? 0} propostas pendentes.`);
      await loadAll(networkMode);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed";
      setRebalancerMsg(`Erro: ${msg}`);
    } finally { setRunningRebalancer(false); }
  }

  function copyFundAddress() {
    if (!fundWallet?.address) return;
    navigator.clipboard.writeText(fundWallet.address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  }

  // ─── Lang picker ─────────────────────────────────────────────────────────────
  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  function LangPicker() {
    return (
      <div ref={langRef} className="relative z-20">
        <button onClick={() => setLangOpen(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white text-xs transition-all">
          <span>{currentLang.flag}</span>
          <span>{currentLang.code.toUpperCase()}</span>
          <ChevronDown size={10} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl py-1 z-50">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-all ${lang === l.code ? "text-white bg-white/8" : "text-white/50 hover:text-white hover:bg-white/5"}`}>
                <span>{l.flag}</span><span>{l.label}</span>
                {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Aguardando wagmi reconectar (evita flash do login no reload) ───────────
  if (!sessionChecked) {
    return <div className="min-h-screen bg-brand-dark" />;
  }

  // ─── Not connected ────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm card text-center">
          <LangPicker />
          <ShieldCheck size={36} className="text-brand-blue mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-1">{t("admin_title")}</h1>
          <p className="text-white/40 text-sm mb-6">{t("admin_connect_wallet")}</p>
          <button onClick={() => openConnectModal?.()} className="btn-primary w-full">
            {t("admin_connect_wallet")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Auth screen ──────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm card text-center">
          <LangPicker />
          {accessDenied ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-red-400 mb-2">{t("admin_not_authorized")}</h1>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
                <p className="text-red-300/80 text-sm">{t("admin_not_authorized_desc")}</p>
                <p className="text-white/30 font-mono text-xs mt-2">{address?.slice(0, 6)}…{address?.slice(-4)}</p>
              </div>
              <button onClick={() => { expireSession(); disconnect(); }}
                className="text-white/40 hover:text-white text-sm transition-colors">
                {t("admin_disconnect")}
              </button>
            </>
          ) : (
            <>
              <ShieldCheck size={36} className="text-brand-blue mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-1">{t("admin_title")}</h1>
              <p className="text-white/40 text-sm mb-2">{t("admin_subtitle")}</p>
              <p className="text-xs text-white/30 font-mono mb-6">{address?.slice(0, 6)}…{address?.slice(-4)}</p>
              <p className="text-white/50 text-sm mb-4">{t("admin_sign_desc")}</p>
              {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
              <button onClick={handleSign} disabled={signing} className="btn-primary w-full disabled:opacity-50">
                {signing ? t("admin_signing") : t("admin_sign_to_auth")}
              </button>
              <div className="mt-3">
                <button onClick={() => disconnect()}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors">
                  {t("admin_disconnect")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const pending  = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const isMainnet = networkMode === "mainnet";
  const ethBal = fundWallet?.eth_balance ?? 0;
  const ethColor = ethBal >= 0.05 ? "text-green-400" : ethBal >= 0.01 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-brand-dark pt-14">

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold">SoSoMon</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40 text-sm">Founder Admin</span>
          <span className="text-xs text-white/20 font-mono">{session.address.slice(0, 6)}…{session.address.slice(-4)}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Network toggle — controls ALL data */}
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden text-xs mr-1">
            <button
              onClick={() => changeNetwork("mainnet")}
              className={`px-3 py-1.5 font-semibold transition-all ${isMainnet ? "bg-green-500/20 text-green-400" : "text-white/30 hover:text-white/60"}`}
            >
              🟢 Mainnet
            </button>
            <button
              onClick={() => changeNetwork("testnet")}
              className={`px-3 py-1.5 font-semibold transition-all ${!isMainnet ? "bg-yellow-500/20 text-yellow-400" : "text-white/30 hover:text-white/60"}`}
            >
              🟡 Testnet
            </button>
          </div>
          <button
            onClick={handleReport}
            disabled={loadingReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs transition-all disabled:opacity-40"
          >
            <BarChart3 size={12} className={loadingReport ? "animate-pulse" : ""} />
            {loadingReport ? "…" : "Relatório"}
          </button>
          <button
            onClick={handleRunRebalancer}
            disabled={runningRebalancer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/20 text-xs transition-all disabled:opacity-40"
          >
            <Play size={12} className={runningRebalancer ? "animate-pulse" : ""} />
            {runningRebalancer ? t("admin_running") : t("admin_run_rebalancer")}
          </button>
          <button onClick={() => loadAll(networkMode)} className="text-white/30 hover:text-white transition-colors">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <LangPicker />
          <button onClick={() => { expireSession(); disconnect(); }} className="text-white/20 hover:text-white/50 text-xs transition-colors">
            {t("admin_disconnect")}
          </button>
        </div>
      </div>

      {rebalancerMsg && (
        <div className="bg-brand-blue/10 border-b border-brand-blue/20 px-6 py-2">
          <p className="text-brand-blue text-xs">{rebalancerMsg}</p>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Stats — network-filtered */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign size={13} className="text-white/30" /><p className="stat-label">{t("admin_total_aum")}</p></div>
              <p className="stat-value">{fmtUSD(stats.total_aum_usd)}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><Users size={13} className="text-white/30" /><p className="stat-label">{t("admin_subscribers")}</p></div>
              <p className="stat-value">{stats.total_subscribers}</p>
              <p className="text-xs text-white/30">{stats.pro_subscribers} Pro</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><BarChart3 size={13} className="text-white/30" /><p className="stat-label">{t("admin_indexes")}</p></div>
              <p className="stat-value">{stats.indexes.length}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={13} className="text-amber-400" /><p className="stat-label">{t("admin_pending")}</p></div>
              <p className={`stat-value ${stats.pending_proposals > 0 ? "text-amber-400" : "text-white"}`}>{stats.pending_proposals}</p>
              <p className="text-xs text-white/30">{t("admin_proposals_label")}</p>
            </div>
          </div>
        )}

        {/* System Alerts */}
        {session && (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/20 bg-green-500/5">
                <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                <p className="text-green-400/70 text-xs">Todos os sistemas operacionais</p>
                {alertsCheckedAt && <span className="ml-auto text-white/20 text-xs">{alertsCheckedAt}</span>}
              </div>
            ) : (
              alerts.map((alert) => {
                const cls: Record<string, string> = {
                  critical: "border-red-500/40 bg-red-500/5 text-red-300",
                  warning:  "border-amber-500/40 bg-amber-500/5 text-amber-300",
                  info:     "border-blue-500/40 bg-blue-500/5 text-blue-300",
                };
                const icons: Record<string, React.ReactNode> = {
                  critical: <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />,
                  warning:  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />,
                  info:     <Clock size={13} className="text-blue-400 shrink-0 mt-0.5" />,
                };
                return (
                  <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cls[alert.severity] ?? "border-white/10 bg-white/5 text-white/60"}`}>
                    {icons[alert.severity]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Fund Wallet — selected network only */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel size={16} className="text-amber-400" />
              <h2 className="font-semibold text-white">{t("admin_fund_wallet_title")}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${isMainnet ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}>
                {isMainnet ? "🟢 Base Mainnet" : "🟡 Base Sepolia"}
              </span>
            </div>
            <button onClick={() => { setFundWallet(null); loadAll(networkMode); }} className="text-white/30 hover:text-white transition-colors">
              <RefreshCw size={13} className={loadingFundWallet ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingFundWallet && !fundWallet && (
            <p className="text-white/30 text-sm text-center py-4">{t("admin_loading_balances")}</p>
          )}

          {fundWallet && (
            <div className="space-y-3">
              {/* ETH */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-center gap-2">
                  <Fuel size={14} className={ethColor} />
                  <span className="text-white/60 text-sm">{t("admin_eth_gas")}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${ethColor}`}>
                    {fundWallet.eth_balance !== null ? fundWallet.eth_balance.toFixed(6) : "—"} ETH
                  </span>
                  {ethBal < 0.01 && <p className="text-red-400 text-xs">{t("admin_eth_critical")}</p>}
                </div>
              </div>

              {/* USDC */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-white/40" />
                  <span className="text-white/60 text-sm">USDC {t("admin_proposals_label") === "propostas" ? "coletado" : "collected"}</span>
                </div>
                <span className="text-white font-bold text-sm">
                  {fundWallet.usdc_balance !== null ? `$${fundWallet.usdc_balance.toFixed(2)}` : "—"}
                </span>
              </div>

              {/* Depositar ETH — QR + endereço para copiar */}
              <div className={`rounded-xl border p-3 ${isMainnet ? "border-green-500/20 bg-green-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Download size={12} className={isMainnet ? "text-green-400" : "text-yellow-400"} />
                  <span className={`text-xs font-semibold ${isMainnet ? "text-green-400" : "text-yellow-400"}`}>
                    Depositar ETH para gas ({isMainnet ? "Base" : "Base Sepolia"})
                  </span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white p-1.5">
                    <QRCodeSVG
                      value={`ethereum:${fundWallet.address}@${isMainnet ? CHAIN_BASE_MAINNET : CHAIN_BASE_SEPOLIA}`}
                      size={88}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-white/30 text-xs leading-tight">Envie ETH da sua carteira para este endereço para cobrir taxas de gas.</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white/50 font-mono text-xs truncate">{fundWallet.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyFundAddress}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs transition-all">
                        <Copy size={11} />
                        {copiedAddr ? "Copiado!" : "Copiar"}
                      </button>
                      {fundWallet.basescan_url && (
                        <a href={fundWallet.basescan_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs transition-all">
                          <ExternalLink size={11} /> Basescan
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio (SoDEX) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-brand-blue" />
              <h2 className="font-semibold text-white">{t("admin_fund_portfolio")}</h2>
              {portfolio && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${portfolio.network === "mainnet" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                  {portfolio.network}
                </span>
              )}
              {!isMainnet && (
                <span className="text-xs text-white/30 italic">SoDEX opera apenas na mainnet</span>
              )}
            </div>
            <button onClick={() => { setLoadingPortfolio(true); adminApi.getPortfolio(session.address, session.message, session.signature).then(d => { setPortfolio(d); setLoadingPortfolio(false); }).catch(() => setLoadingPortfolio(false)); }} className="text-white/30 hover:text-white transition-colors">
              <RefreshCw size={13} className={loadingPortfolio ? "animate-spin" : ""} />
            </button>
          </div>

          {!portfolio && loadingPortfolio && <p className="text-white/30 text-sm text-center py-4">{t("admin_loading_portfolio")}</p>}
          {!portfolio && !loadingPortfolio && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
              <p className="text-amber-400 text-sm">{t("admin_sodex_not_configured")}</p>
            </div>
          )}

          {portfolio && portfolio.configured && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/40 text-sm">{t("admin_total_value")}</span>
                <span className="text-white font-bold text-lg">{fmtUSD(portfolio.total_usd)}</span>
              </div>
              <div className="space-y-2">
                {portfolio.positions.filter((p) => p.usd_value > 0).map((pos) => (
                  <div key={pos.asset} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm font-medium w-16">{pos.asset}</span>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue rounded-full" style={{ width: `${Math.min(pos.weight_pct, 100)}%` }} />
                      </div>
                      <span className="text-white/40 text-xs">{pos.weight_pct.toFixed(1)}%</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{fmtUSD(pos.usd_value)}</p>
                      <p className="text-xs text-white/30">{pos.amount.toFixed(6)} {pos.asset}</p>
                    </div>
                  </div>
                ))}
                {portfolio.positions.filter((p) => p.usd_value > 0).length === 0 && (
                  <p className="text-white/30 text-sm text-center py-3">{t("admin_no_positions")}</p>
                )}
              </div>
              <p className="text-xs text-white/20 font-mono mt-3">{portfolio.wallet}</p>
            </>
          )}
        </div>

        {/* Movimentações do Fundo */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-brand-blue" />
              <h2 className="font-semibold text-white">{t("tab_movements")}</h2>
            </div>
            <button
              onClick={() => {
                setLoadingMovements(true);
                adminApi.getMovements(session!.address, session!.message, session!.signature, networkMode)
                  .then(d => setMovements((d?.movements ?? []) as Movement[]))
                  .catch(() => {})
                  .finally(() => setLoadingMovements(false));
              }}
              className="text-white/30 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loadingMovements ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingMovements && movements.length === 0 && (
            <p className="text-white/30 text-sm text-center py-4">{t("admin_loading_portfolio")}</p>
          )}

          {!loadingMovements && movements.length === 0 && (
            <p className="text-white/30 text-sm text-center py-6">{t("mov_empty")}</p>
          )}

          {movements.length > 0 && (
            <div className="space-y-2">
              {movements.map((m) => {
                const typeColor = {
                  deposit: "text-green-400 bg-green-500/10 border-green-500/20",
                  refund: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                  withdrawal: "text-red-400 bg-red-500/10 border-red-500/20",
                  manual: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                  other: "text-white/40 bg-white/5 border-white/10",
                }[m.type] ?? "text-white/40 bg-white/5 border-white/10";
                const typeLabel = {
                  deposit: t("mov_deposit"),
                  refund: t("mov_refund"),
                  withdrawal: t("mov_withdrawal"),
                  manual: t("mov_manual"),
                  other: m.action,
                }[m.type] ?? m.type;
                const isExpanded = expandedMovement === m.id;
                return (
                  <div key={m.id} className="rounded-lg bg-white/3 overflow-hidden border border-white/5">
                    <button
                      onClick={() => setExpandedMovement(isExpanded ? null : m.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${typeColor}`}>{typeLabel}</span>
                      <span className="text-white font-medium text-sm">${m.amount_usd.toFixed(2)}</span>
                      <span className="text-xs text-white/40 font-mono truncate flex-1">{m.wallet.slice(0, 8)}…{m.wallet.slice(-4)}</span>
                      {m.type === "refund" && (
                        <span className={`text-xs shrink-0 ${m.refund_ok === true ? "text-green-400" : m.refund_ok === false ? "text-red-400" : "text-yellow-400"}`}>
                          {m.refund_ok === true ? t("mov_status_ok") : m.refund_ok === false ? t("mov_status_failed") : t("mov_status_pending")}
                        </span>
                      )}
                      <span className="text-xs text-white/25 shrink-0">
                        {new Date(m.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                        {m.index_id && (
                          <p className="text-xs text-white/40"><span className="text-white/25">{t("mov_index")}: </span>{m.index_id}</p>
                        )}
                        {m.tx_hash && (
                          <p className="text-xs text-white/40 flex items-center gap-1.5">
                            <span className="text-white/25">{t("mov_tx")}: </span>
                            <span className="font-mono truncate">{m.tx_hash.slice(0, 20)}…</span>
                            {m.basescan && <a href={m.basescan} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:text-blue-300 shrink-0">↗</a>}
                          </p>
                        )}
                        {m.refund_tx && (
                          <p className="text-xs text-white/40 flex items-center gap-1.5">
                            <span className="text-white/25">{t("mov_refund_tx")}: </span>
                            <span className="font-mono truncate">{m.refund_tx.slice(0, 20)}…</span>
                            {m.refund_basescan && <a href={m.refund_basescan} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:text-blue-300 shrink-0">↗</a>}
                          </p>
                        )}
                        {m.manual_credit && <p className="text-xs text-blue-400">Crédito manual</p>}
                        {m.description && <p className="text-xs text-white/30 leading-relaxed">{m.description}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Relatório Gerencial */}
        {showReport && report && (() => {
          const p = report.platform as Record<string, unknown>;
          const indexes = report.indexes as Array<Record<string, unknown>>;
          const proposals = report.proposals as Record<string, unknown>;
          const byStatus = proposals.by_status as Record<string, number> ?? {};
          const activity = report.recent_activity as Array<Record<string, unknown>>;
          return (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-blue" />
                  <h2 className="font-semibold text-white">{t("admin_report_title")}</h2>
                  <span className="text-white/20 text-xs">{String(report.generated_at ?? "").replace("T", " ").slice(0, 19)} UTC</span>
                </div>
                <button onClick={() => setShowReport(false)} className="text-white/30 hover:text-white/60 text-xs border border-white/10 rounded px-2 py-1">{t("admin_report_close")}</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: t("admin_total_aum"), value: fmtUSD(Number(p.total_aum_usd ?? 0)) },
                  { label: t("admin_subscribers"), value: String(p.total_investors ?? 0) },
                  { label: "Pro", value: String(p.pro_investors ?? 0) },
                  { label: t("admin_report_proposals_total"), value: String(proposals.total ?? 0) },
                ].map(s => (
                  <div key={s.label} className="bg-white/3 rounded-xl p-3 border border-white/5">
                    <p className="text-white/40 text-xs mb-1">{s.label}</p>
                    <p className="text-white font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mb-6">
                <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{t("admin_report_proposals_status")}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(byStatus).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-white/5 text-sm">
                      <span className={`capitalize ${STATUS_BADGE[k]?.split(" ")[1] ?? "text-white/60"}`}>{k}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                  {Object.keys(byStatus).length === 0 && <p className="text-white/30 text-xs">{t("admin_report_no_proposals")}</p>}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{t("admin_report_indexes")}</p>
                <div className="space-y-2">
                  {indexes.map(idx => (
                    <div key={String(idx.id)} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3">
                      <div>
                        <p className="text-sm text-white font-medium">{String(idx.name)}</p>
                        <p className="text-xs text-white/30">{t("admin_investors").replace("{n}", String(idx.subscriber_count ?? 0))} · NAV ${Number(idx.nav_usd ?? 1).toFixed(4)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{fmtUSD(Number(idx.aum_usd ?? 0))}</p>
                        <p className={`text-xs ${Number(idx.return_30d_pct) >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {Number(idx.return_30d_pct) >= 0 ? "+" : ""}{Number(idx.return_30d_pct).toFixed(1)}% 30d
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {activity.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{t("admin_report_activity")}</p>
                  <div className="space-y-1">
                    {activity.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/5">
                        <span className="text-white/30 text-xs font-mono w-20 shrink-0">{String(a.agent)}</span>
                        <span className="text-white/60 text-xs truncate">{String(a.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Proposals (global — index-level, not per-network) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              {t("admin_proposals_title")}
              {pending.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                  {t("admin_pending_badge", { n: pending.length })}
                </span>
              )}
              {approved.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                  {t("admin_ready_badge", { n: approved.length })}
                </span>
              )}
            </h2>
          </div>

          {proposals.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-white/30 text-sm">{t("admin_no_proposals")}</p>
              <p className="text-white/20 text-xs mt-1">{t("admin_no_proposals_sub")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <div key={p.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}>{p.status}</span>
                        <span className="text-xs text-white/40 font-mono">{p.index_name}</span>
                        <span className="text-xs text-white/20">trigger: {p.trigger}</span>
                        <span className="text-xs text-white/20 flex items-center gap-1"><Clock size={10} /> {timeAgo(p.proposed_at)}</span>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{p.ai_rationale}</p>
                      {executeResult[p.id] && (
                        <p className={`text-xs mt-2 ${executeResult[p.id].startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                          {executeResult[p.id]}
                        </p>
                      )}
                      {p.changes && p.changes.length > 0 && (
                        <div className="mt-3">
                          <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                            className="text-xs text-brand-blue hover:underline">
                            {expanded === p.id ? t("admin_hide_changes") : t("admin_show_changes", { n: p.changes.length })}
                          </button>
                          {expanded === p.id && (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                              {p.changes.map((c, i) => (
                                <div key={i} className="bg-white/3 rounded-lg p-2 text-xs">
                                  <span className="text-white font-mono">{c.symbol}</span>
                                  <span className="text-white/30 ml-2">{c.action}</span>
                                  {c.old_weight !== undefined && (
                                    <div className="text-white/30 mt-0.5">{c.old_weight}% → <span className="text-white">{c.new_weight}%</span></div>
                                  )}
                                  {c.rationale && <p className="text-white/20 mt-1 leading-tight">{c.rationale}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {p.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(p.id)} disabled={actionId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs transition-all disabled:opacity-40">
                            <XCircle size={13} /> {t("admin_reject")}
                          </button>
                          <button onClick={() => handleApprove(p.id)} disabled={actionId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs transition-all disabled:opacity-40">
                            <CheckCircle2 size={13} /> {t("admin_approve")}
                          </button>
                        </div>
                      )}
                      {(p.status === "approved" || p.status === "pending") && (
                        <div className="flex gap-2">
                          <button onClick={() => handleExecute(p.id, true)} disabled={executingId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 text-xs transition-all disabled:opacity-40">
                            <Zap size={12} /> {t("admin_dry_run")}
                          </button>
                          <button onClick={() => handleExecute(p.id, false)} disabled={executingId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/20 text-xs transition-all disabled:opacity-40">
                            <Play size={12} className={executingId === p.id ? "animate-pulse" : ""} />
                            {executingId === p.id ? t("admin_executing") : t("admin_execute")}
                          </button>
                        </div>
                      )}
                      {p.status !== "pending" && p.status !== "approved" && (
                        <div className="text-xs text-white/20">
                          {p.approved_at && <p>Approved {timeAgo(p.approved_at)}</p>}
                          {p.executed_at && <p>Executed {timeAgo(p.executed_at)}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trade History */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-brand-blue" />
              <h2 className="font-semibold text-white">{t("admin_trades_title")} — SoDEX</h2>
            </div>
            <button onClick={() => { setLoadingTrades(true); adminApi.getTrades(session.address, session.message, session.signature, 20).then(d => { setTrades(Array.isArray(d) ? d : []); setLoadingTrades(false); }).catch(() => setLoadingTrades(false)); }} className="text-white/30 hover:text-white transition-colors">
              <RefreshCw size={13} className={loadingTrades ? "animate-spin" : ""} />
            </button>
          </div>
          {loadingTrades && trades.length === 0 && <p className="text-white/30 text-sm text-center py-4">{t("admin_loading_trades")}</p>}
          {!loadingTrades && trades.length === 0 && (
            <div className="text-center py-6">
              <p className="text-white/30 text-sm">{t("admin_no_trades")}</p>
              <p className="text-white/20 text-xs mt-1">{t("admin_no_trades_sub")}</p>
            </div>
          )}
          {trades.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/20 border-b border-white/5">
                    <th className="text-left pb-2 font-normal">Symbol</th>
                    <th className="text-left pb-2 font-normal">Side</th>
                    <th className="text-right pb-2 font-normal">Qty</th>
                    <th className="text-right pb-2 font-normal">Price (USD)</th>
                    <th className="text-right pb-2 font-normal">Status</th>
                    <th className="text-right pb-2 font-normal">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {trades.map((tr, i) => (
                    <tr key={tr.id ?? i}>
                      <td className="py-2 font-mono text-white">{String(tr.symbol ?? tr.s ?? "—")}</td>
                      <td className={`py-2 font-medium ${String(tr.side).toUpperCase() === "BUY" ? "text-green-400" : "text-red-400"}`}>
                        {String(tr.side ?? "—").toUpperCase()}
                      </td>
                      <td className="py-2 text-right text-white/60">{String(tr.quantity ?? tr.qty ?? "—")}</td>
                      <td className="py-2 text-right text-white/60">{tr.price ? `$${tr.price}` : "—"}</td>
                      <td className="py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${String(tr.status) === "placed" || String(tr.status) === "filled" ? "text-green-400" : "text-white/40"}`}>
                          {String(tr.status ?? "—")}
                        </span>
                      </td>
                      <td className="py-2 text-right text-white/30">{tr.created_at ? timeAgo(String(tr.created_at)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Index Overview */}
        {stats && stats.indexes.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-white mb-4">{t("admin_index_overview")}</h2>
            <div className="space-y-2">
              {stats.indexes.map((idx) => (
                <div key={idx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/3">
                  <div>
                    <p className="text-sm text-white font-medium">{idx.name}</p>
                    <p className="text-xs text-white/30">{t("admin_investors", { n: idx.subscriber_count })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{fmtUSD(idx.aum_usd)}</p>
                    <p className={`text-xs ${idx.return_30d_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {idx.return_30d_pct >= 0 ? "+" : ""}{idx.return_30d_pct.toFixed(1)}% 30d
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
