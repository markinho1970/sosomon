"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, RefreshCw, TrendingUp, Info, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import Navbar from "../../components/Navbar";
import InvestButton from "../../components/InvestButton";
import { indexApi, investApi } from "@/lib/api";
import type { AlphaIndex } from "@/types";

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

function FundWalletBox({ indexId }: { indexId: string }) {
  const [wallet, setWallet] = useState<{ address: string | null; usdc_balance: number | null; configured: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    investApi.getFundWallet().then(setWallet).catch(() => {});
  }, []);

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
      <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Fund Wallet (Base Network)</p>
      <div className="bg-white/3 rounded-lg p-3 space-y-2">
        <p className="text-xs text-white/40 leading-relaxed">
          Send USDC on Base to the address below. Your position is registered automatically after deposit is detected.
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
          <span className="text-white/30">USDC Balance on Base</span>
          <span className="text-white font-medium">
            {wallet.usdc_balance !== null ? `$${wallet.usdc_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
          </span>
        </div>
        <a
          href={`https://basescan.org/address/${wallet.address}`}
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

  const [idx, setIdx] = useState<AlphaIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    indexApi.getBySlug(slug)
      .then(setIdx)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

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
          <p className="text-white/40 mb-4">Index not found.</p>
          <Link href="/indexes" className="btn-ghost">← Back to Indexes</Link>
        </div>
      </div>
    );
  }

  const alphaBTC = (idx.return_30d_pct ?? 0) - (idx.btc_benchmark_30d ?? 0);

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* Header */}
      <div className={`bg-gradient-to-b ${THEME_HEADER[idx.theme] ?? "from-white/5 to-transparent"} pt-32 pb-8 px-4`}>
        <div className="max-w-7xl mx-auto">
          <Link href="/indexes" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white mb-4 transition-colors w-fit">
            <ArrowLeft size={14} /> Back to Indexes
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <span className={`badge text-xs mb-3 inline-flex ${THEME_BADGE[idx.theme] ?? "bg-white/10 text-white/60"}`}>
                {THEME_LABELS[idx.theme] ?? idx.theme}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{idx.name}</h1>
              <p className="text-white/50 max-w-xl">{idx.description}</p>
            </div>
            <div className="flex gap-3">
              <Link href="#invest" className="btn-primary">Invest Now</Link>
              <Link href="/dashboard" className="btn-ghost">My Portfolio</Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "AUM", value: fmt(idx.aum_usd ?? 0, true) },
            { label: "NAV per Token", value: `$${(idx.nav_usd ?? 0).toFixed(3)}` },
            { label: "30d Return", value: `+${(idx.return_30d_pct ?? 0).toFixed(1)}%`, green: true },
            { label: "vs BTC Alpha", value: `${alphaBTC >= 0 ? "+" : ""}${alphaBTC.toFixed(1)}%`, green: alphaBTC > 0 },
            { label: "All-Time Return", value: `+${(idx.total_return_pct ?? 0).toFixed(1)}%`, green: true },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p className={`text-xl font-bold ${s.green ? "text-green-400" : "text-white"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Constituents */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Constituents</h2>
              {idx.last_rebalanced_at && (
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <RefreshCw size={11} />
                  Rebalanced {new Date(idx.last_rebalanced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {idx.constituents?.map((token) => (
                <div key={token.symbol} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/3 transition-colors group">
                  {/* Weight bar */}
                  <div className="w-24 shrink-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-mono text-white/60">{token.symbol}</span>
                      <span className="text-xs text-white/30">{token.weight}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue/60 rounded-full"
                        style={{ width: `${Math.min((token.weight / 20) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{token.name}</p>
                    <p className="text-xs text-white/30">{fmt(token.current_price_usd ?? 0)}</p>
                  </div>

                  {/* 7d change */}
                  <div className={`text-sm font-medium shrink-0 ${(token.price_change_7d ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {(token.price_change_7d ?? 0) >= 0 ? "+" : ""}{(token.price_change_7d ?? 0).toFixed(1)}%
                  </div>

                  {/* Rationale tooltip */}
                  {token.ai_rationale && (
                    <div className="relative group/tip shrink-0">
                      <Info size={13} className="text-white/20 hover:text-white/50 cursor-help transition-colors" />
                      <div className="absolute right-0 top-6 w-64 bg-brand-gray border border-white/10 rounded-lg p-3 text-xs text-white/60 leading-relaxed z-10 hidden group-hover/tip:block shadow-xl">
                        {token.ai_rationale}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Rebalance summary */}
            {idx.rebalance_summary && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1.5">Last Rebalance Summary</p>
                <p className="text-sm text-white/50 leading-relaxed">{idx.rebalance_summary}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Invest CTA */}
            <div id="invest" className="card border-brand-blue/20 bg-brand-blue/5">
              <h3 className="font-semibold text-white mb-1">Invest in this Index</h3>
              <p className="text-xs text-white/40 mb-4">Minimum $50 · Receive index tokens · Withdraw anytime</p>
              <div className="space-y-2 text-sm text-white/50 mb-4">
                <div className="flex justify-between">
                  <span>Management fee</span>
                  <span className="text-white">{idx.management_fee_pct ?? 0.75}% /yr</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance fee</span>
                  <span className="text-white">15% on profits</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol</span>
                  <span className="text-white">SoSoValue ValueChain</span>
                </div>
              </div>
              <InvestButton indexId={idx.id} indexName={idx.name} navUsd={idx.nav_usd ?? 1} />
              <FundWalletBox indexId={idx.id} />
            </div>

            {/* Subscribers */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-white/40" />
                <p className="text-sm font-medium text-white">{idx.subscriber_count ?? 0} investors</p>
              </div>
              <p className="text-xs text-white/30">
                {idx.subscriber_count ?? 0} wallets currently invested in this index.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
