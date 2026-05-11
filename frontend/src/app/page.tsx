"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Zap, RefreshCw } from "lucide-react";
import Navbar from "./components/Navbar";
import { indexApi, statsApi } from "@/lib/api";
import type { AlphaIndex } from "@/types";

const THEME_COLORS: Record<string, string> = {
  "ai-crypto": "from-orange-600/10 to-transparent border-orange-500/20",
  rwa: "from-orange-500/10 to-transparent border-orange-400/20",
  depin: "from-amber-600/10 to-transparent border-amber-500/20",
};

const THEME_BADGE: Record<string, string> = {
  "ai-crypto": "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  rwa: "bg-orange-400/10 text-orange-300 border border-orange-400/20",
  depin: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const THEME_LABELS: Record<string, string> = {
  "ai-crypto": "AI × Crypto",
  rwa: "Real World Assets",
  depin: "DePIN",
};

function formatUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export default function Home() {
  const [indexes, setIndexes] = useState<AlphaIndex[]>([]);
  const [stats, setStats] = useState({
    total_aum_usd: 0,
    active_indexes: 0,
    total_subscribers: 0,
    avg_return_30d_pct: 0,
  });

  useEffect(() => {
    indexApi.getAll().then(setIndexes).catch(() => {});
    statsApi.get().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(249,115,22,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-orange/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
            Built on SoSoValue ValueChain · Powered by SoDEX
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
            Thematic indexes.
            <br />
            <span className="text-brand-orange">Managed by AI.</span>
            <br />
            Verified on-chain.
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            SoSoMon runs AI agents that screen, rebalance, and report on crypto thematic indexes —
            institutional-quality portfolio management, fully automated on SoSoValue ValueChain.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/indexes" className="flex items-center justify-center gap-2 text-base px-8 py-4 bg-brand-orange hover:bg-brand-orange-dark text-black font-semibold rounded-full transition-all">
              Explore Indexes
              <ArrowRight size={18} />
            </Link>
            <Link href="#how-it-works" className="flex items-center justify-center gap-2 text-base px-8 py-4 border border-white/10 hover:border-brand-orange/40 rounded-full transition-all text-white/70 hover:text-white">
              How it Works
            </Link>
          </div>

          {/* Live stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Total AUM", value: formatUSD(stats.total_aum_usd) },
              { label: "Active Indexes", value: stats.active_indexes.toString() },
              { label: "Subscribers", value: stats.total_subscribers.toString() },
              { label: "Avg 30d Return", value: stats.avg_return_30d_pct > 0 ? `+${stats.avg_return_30d_pct}%` : "—" },
            ].map((s) => (
              <div key={s.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Index Cards ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Active Indexes</h2>
          <Link href="/indexes" className="text-sm text-brand-orange hover:text-orange-400 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {indexes.map((idx) => (
            <Link key={idx.id} href={`/indexes/${idx.id}`}>
              <div className={`relative border rounded-xl p-6 cursor-pointer hover:scale-[1.01] transition-all duration-200 bg-gradient-to-b ${THEME_COLORS[idx.theme] ?? "from-white/5 to-transparent border-white/10"}`}>
                <span className={`text-xs mb-3 inline-flex px-2 py-1 rounded-full ${THEME_BADGE[idx.theme] ?? "bg-white/10 text-white/60"}`}>
                  {THEME_LABELS[idx.theme] ?? idx.theme}
                </span>
                <h3 className="font-semibold text-white text-lg mb-2">{idx.name}</h3>
                <p className="text-sm text-white/40 mb-4 leading-relaxed">{idx.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/30 mb-0.5">AUM</p>
                    <p className="font-semibold text-white">{formatUSD(idx.aum_usd ?? 0)}</p>
                  </div>
                  <div className={`text-xl font-bold ${(idx.return_30d_pct ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {(idx.return_30d_pct ?? 0) >= 0 ? "+" : ""}{(idx.return_30d_pct ?? 0).toFixed(1)}%
                    <p className="text-xs font-normal text-white/30 text-right">30d</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">One person. Three AI agents.</h2>
          <p className="text-white/40 max-w-xl mx-auto">
            SoSoMon runs entirely on AI agents operating on SoSoValue ValueChain. The agents handle everything.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Bot size={24} className="text-brand-orange" />,
              bg: "bg-brand-orange/10 border-brand-orange/20",
              agent: "Scout",
              role: "Research & Screening",
              description: "Scans 400+ tokens daily using SoSoValue data feeds and SoDEX market data. Outputs ranked inclusion lists with AI-written rationale.",
            },
            {
              icon: <RefreshCw size={24} className="text-brand-orange" />,
              bg: "bg-brand-orange/10 border-brand-orange/20",
              agent: "Rebalancer",
              role: "Portfolio Maintenance",
              description: "Monitors drift, sentiment score, and liquidity. Proposes rebalancing weekly or when risk triggers are hit. Executes orders on SoDEX.",
            },
            {
              icon: <Zap size={24} className="text-brand-orange" />,
              bg: "bg-brand-orange/10 border-brand-orange/20",
              agent: "Narrator",
              role: "Content & Reports",
              description: "Generates the weekly Alpha Memo, Twitter threads, and subscriber digests automatically from agent data. Full transparency, zero spin.",
            },
          ].map((item) => (
            <div key={item.agent} className="bg-brand-card border border-white/5 rounded-2xl p-6">
              <div className={`inline-flex p-3 rounded-xl border mb-4 ${item.bg}`}>
                {item.icon}
              </div>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-1">{item.role}</p>
              <h3 className="text-xl font-bold text-white mb-2">Agent: {item.agent}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-4xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-white/40">No hidden fees. No lock-in. Pay only for what you use.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-brand-card border border-white/5 rounded-2xl p-6">
            <p className="text-sm text-white/40 mb-1">Free</p>
            <p className="text-4xl font-bold text-white mb-1">$0</p>
            <p className="text-sm text-white/30 mb-6">+ 0.75% annual management fee on AUM</p>
            <ul className="space-y-3 text-sm text-white/60">
              {["Access to 1 index (read-only)", "On-chain dashboard", "Weekly Alpha Memo (preview)", "0.75% management fee"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-orange">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/indexes" className="block w-full text-center mt-6 border border-white/10 hover:border-brand-orange/40 rounded-full px-4 py-3 text-sm text-white/60 hover:text-white transition-all">
              Get Started Free
            </Link>
          </div>

          <div className="bg-brand-card border border-brand-orange/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-orange text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
              Most Popular
            </div>
            <p className="text-sm text-brand-orange mb-1">Pro</p>
            <p className="text-4xl font-bold text-white mb-1">$29<span className="text-lg font-normal text-white/40">/mo</span></p>
            <p className="text-sm text-white/30 mb-6">or $249/year (save 28%) · + 15% performance fee</p>
            <ul className="space-y-3 text-sm text-white/60">
              {["All indexes, full access", "Full weekly Alpha Memo", "Discord Pro channel + alerts", "Early access to new indexes", "Monthly founder Q&A"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-orange">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/indexes" className="block w-full text-center mt-6 bg-brand-orange hover:bg-brand-orange-dark text-black font-semibold rounded-full px-4 py-3 text-sm transition-all">
              Start Pro — $29/mo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">SoSo<span className="text-brand-orange">Mon</span></span>
            <span className="text-white/20 text-xs">by SoSoValue ValueChain</span>
          </div>
          <p className="text-xs text-white/20">
            Not financial advice. Built on SoSoValue ValueChain. Powered by SoDEX. · © 2025 SoSoMon
          </p>
          <div className="flex gap-4 text-xs text-white/30">
            <a href="https://sodex.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors">SoDEX</a>
            <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors">SoSoValue</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
