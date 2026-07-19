"use client";

import Link from "next/link";
import {
  CheckCircle2, ArrowRight, Sparkles, Shield, BarChart3,
  Layers, Eye, Cpu, Bot, Zap, Lock, Globe, ArrowDownCircle, FlaskConical,
  FileSignature, Timer, AlertTriangle, ToggleLeft, Droplets,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useLang } from "@/lib/LanguageContext";

export default function WhatsNewPage() {
  const { t } = useLang();

  const WAVE1 = [
    {
      icon: <Bot size={16} className="text-purple-400" />,
      title: t("wn1_agents_title"),
      desc: t("wn1_agents_desc"),
    },
    {
      icon: <Layers size={16} className="text-cyan-400" />,
      title: t("wn1_indexes_title"),
      desc: t("wn1_indexes_desc"),
    },
    {
      icon: <Globe size={16} className="text-blue-400" />,
      title: t("wn1_ssv_api_title"),
      desc: t("wn1_ssv_api_desc"),
    },
    {
      icon: <Cpu size={16} className="text-blue-400" />,
      title: t("wn1_sodex_title"),
      desc: t("wn1_sodex_desc"),
    },
    {
      icon: <BarChart3 size={16} className="text-emerald-400" />,
      title: t("wn1_dashboard_title"),
      desc: t("wn1_dashboard_desc"),
    },
    {
      icon: <Lock size={16} className="text-yellow-400" />,
      title: t("wn1_admin_title"),
      desc: t("wn1_admin_desc"),
    },
  ];

  const WAVE2 = [
    {
      icon: <Layers size={16} className="text-cyan-400" />,
      title: t("wn2_deposit_title"),
      desc: t("wn2_deposit_desc"),
      badge: "NEW",
    },
    {
      icon: <CheckCircle2 size={16} className="text-green-400" />,
      title: t("wn2_trade_title"),
      desc: t("wn2_trade_desc"),
      badge: "NEW",
    },
    {
      icon: <Eye size={16} className="text-white/80" />,
      title: t("wn2_transparency_title"),
      desc: t("wn2_transparency_desc"),
      badge: "NEW",
    },
    {
      icon: <Shield size={16} className="text-yellow-400" />,
      title: t("wn2_sentiment_title"),
      desc: t("wn2_sentiment_desc"),
      badge: "NEW",
    },
    {
      icon: <Sparkles size={16} className="text-purple-400" />,
      title: t("wn2_gemini_title"),
      desc: t("wn2_gemini_desc"),
      badge: "IMPROVED",
    },
    {
      icon: <Bot size={16} className="text-emerald-400" />,
      title: t("wn2_narrator_title"),
      desc: t("wn2_narrator_desc"),
      badge: "IMPROVED",
    },
    {
      icon: <Zap size={16} className="text-amber-400" />,
      title: t("wn2_admin_rebal_title"),
      desc: t("wn2_admin_rebal_desc"),
      badge: "NEW",
    },
    {
      icon: <BarChart3 size={16} className="text-blue-400" />,
      title: t("wn2_admin_portfolio_title"),
      desc: t("wn2_admin_portfolio_desc"),
      badge: "NEW",
    },
    {
      icon: <Lock size={16} className="text-red-400" />,
      title: t("wn2_admin_lock_title"),
      desc: t("wn2_admin_lock_desc"),
      badge: "SECURITY",
    },
    {
      icon: <ArrowDownCircle size={16} className="text-green-400" />,
      title: t("wn2_withdrawal_title"),
      desc: t("wn2_withdrawal_desc"),
      badge: "NEW",
    },
    {
      icon: <FlaskConical size={16} className="text-cyan-400" />,
      title: t("wn2_sandbox_title"),
      desc: t("wn2_sandbox_desc"),
      badge: "NEW",
    },
    {
      icon: <FileSignature size={16} className="text-purple-400" />,
      title: t("wn2_eip191_title"),
      desc: t("wn2_eip191_desc"),
      badge: "SECURITY",
    },
    {
      icon: <AlertTriangle size={16} className="text-amber-400" />,
      title: t("wn2_routing_title"),
      desc: t("wn2_routing_desc"),
      badge: "NEW",
    },
    {
      icon: <Timer size={16} className="text-blue-400" />,
      title: t("wn2_session_title"),
      desc: t("wn2_session_desc"),
      badge: "SECURITY",
    },
  ];

  const COMING_SOON = [
    t("wn_cs_backup"),
    t("wn_cs_notifications"),
    t("wn_cs_escrow"),
    t("wn_cs_multiwallet"),
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-sm font-medium uppercase tracking-wider">{t("wn_wave3_label")}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("wn_title")}</h1>
          <p className="text-white/50">{t("wn_subtitle")}</p>
        </div>

        {/* Wave 2 — new features */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
            <span className="text-amber-400 font-bold text-sm uppercase tracking-widest">{t("wn_wave2_label")}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-amber-400/40 to-transparent" />
          </div>

          {/* Destaque especial: Network Lock on Connect */}
          <div className="mb-4 rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={20} className="text-orange-400" />
              <span className="text-orange-300 font-bold text-base">{t("wn2_toggle_title")}</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40">TESTNET</span>
            </div>
            <p className="text-orange-200/70 text-sm leading-relaxed mb-3">
              {t("wn2_toggle_desc")}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 font-medium">✓ {t("wn_toggle_free")}</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-medium">✓ {t("wn_toggle_eval")}</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 font-medium">✓ {t("wn_toggle_safe")}</span>
            </div>
          </div>

          {/* Faucet highlight card */}
          <div className="mb-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={20} className="text-sky-400" />
              <span className="text-sky-300 font-bold text-base">{t("wn_faucet_title")}</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40">{t("wn_faucet_badge")}</span>
            </div>
            <p className="text-sky-200/70 text-sm leading-relaxed mb-3">
              {t("wn_faucet_desc")}
            </p>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 font-medium">⚡ {t("wn_faucet_f1")}</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">💵 {t("wn_faucet_f2")}</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/8 text-white/60 font-medium">✓ {t("wn_faucet_f3")}</span>
            </div>
            <Link
              href="/faucet-sepolia"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              {t("wn_faucet_cta")}
            </Link>
          </div>

          {/* API Integration Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            {/* SoSoValue API */}
            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-5">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={18} className="text-blue-400" />
                <span className="text-blue-300 font-bold text-sm">SoSoValue API</span>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40">{t("wn_api_ssv_badge")}</span>
              </div>
              <p className="text-blue-200/60 text-xs leading-relaxed mb-3">{t("wn_api_ssv_desc")}</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-blue-300">get_macro_context()</span> — {t("wn_api_ssv_fn1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-blue-300">get_sentiment_score()</span> — {t("wn_api_ssv_fn2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-blue-300">get_token_prices()</span> — {t("wn_api_ssv_fn3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-blue-300">get_index_benchmarks()</span> — {t("wn_api_ssv_fn4")}</span>
                </li>
              </ul>
            </div>

            {/* SoDEX API */}
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={18} className="text-purple-400" />
                <span className="text-purple-300 font-bold text-sm">SoDEX API</span>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40">{t("wn_api_sdx_badge")}</span>
              </div>
              <p className="text-purple-200/60 text-xs leading-relaxed mb-3">{t("wn_api_sdx_desc")}</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-purple-300">get_portfolio_snapshot()</span> — {t("wn_api_sdx_fn1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-purple-300">execute_rebalance_trades()</span> — {t("wn_api_sdx_fn2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-purple-300">get_all_tickers()</span> — {t("wn_api_sdx_fn3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-white/70"><span className="font-mono text-purple-300">get_trade_history()</span> — {t("wn_api_sdx_fn4")}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            {WAVE2.map((item, i) => (
              <div key={i} className="card border border-white/8 hover:border-white/15 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm">{item.title}</span>
                      {item.badge && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          item.badge === "NEW"      ? "bg-amber-500/20 text-amber-400" :
                          item.badge === "IMPROVED" ? "bg-blue-500/20 text-blue-400" :
                          item.badge === "TESTNET"  ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Wave 1 — foundation */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
            <span className="text-white/40 font-bold text-sm uppercase tracking-widest">{t("wn_wave1_label")}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/20 to-transparent" />
          </div>
          <div className="space-y-3">
            {WAVE1.map((item, i) => (
              <div key={i} className="card border border-white/5 opacity-70">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/80 font-semibold text-sm">{item.title}</span>
                      <CheckCircle2 size={13} className="text-green-500/60" />
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coming soon */}
        <section className="card border border-dashed border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <ArrowRight size={15} className="text-white/40" />
            {t("wn_roadmap")}
          </h3>
          <ul className="space-y-2">
            {COMING_SOON.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Links */}
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/transparency" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
            <Eye size={14} /> {t("wn_link_transparency")}
          </Link>
          <Link href="/indexes" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
            <BarChart3 size={14} /> {t("wn_link_indexes")}
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
            <Zap size={14} /> {t("wn_link_dashboard")}
          </Link>
        </div>
      </main>
    </div>
  );
}
