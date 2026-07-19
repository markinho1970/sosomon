"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  FlaskConical, Droplets, ExternalLink, CheckCircle, Loader2,
  ArrowRight, Lightbulb, Zap, Wallet, AlertCircle,
  TrendingUp, BarChart3, DollarSign, RefreshCw, TestTube2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { useLang } from "@/lib/LanguageContext";

const CIRCLE_FAUCET = "https://faucet.circle.com/";
const MAX_CLAIMS = 3;

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { isTestnet } = useNetworkMode();
  const { t } = useLang();
  const [claimCount, setClaimCount] = useState(0);
  const [allClaimed, setAllClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isTestnet) return;
    setChecking(true);
    fetch(`/api/faucet/status/${address}`)
      .then(r => r.json())
      .then(d => {
        setClaimCount(d.count ?? 0);
        if (d.claimed) setAllClaimed(true);
        if (d.basescan) setLastTx(d.basescan);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [address, isTestnet]);

  async function handleClaim() {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/faucet/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setAllClaimed(true); return; }
        throw new Error(data.detail ?? "Faucet error");
      }
      const newCount = claimCount + 1;
      setClaimCount(newCount);
      if (newCount >= MAX_CLAIMS) setAllClaimed(true);
      if (data.basescan) setLastTx(data.basescan);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const STEPS = [
    {
      num: "01",
      icon: <Wallet size={18} className="text-sky-400" />,
      title: t("faucet_step1_title"),
      desc: t("faucet_step1_desc"),
    },
    {
      num: "02",
      icon: <Droplets size={18} className="text-sky-400" />,
      title: t("faucet_step2_title"),
      desc: t("faucet_step2_desc"),
    },
    {
      num: "03",
      icon: <DollarSign size={18} className="text-emerald-400" />,
      title: t("faucet_step3_title"),
      desc: t("faucet_step3_desc"),
    },
    {
      num: "04",
      icon: <TrendingUp size={18} className="text-amber-400" />,
      title: t("faucet_step4_title"),
      desc: t("faucet_step4_desc"),
    },
  ];

  const TIPS = [
    { icon: <BarChart3 size={14} className="text-purple-400" />, text: t("faucet_tip1") },
    { icon: <RefreshCw size={14} className="text-cyan-400" />,   text: t("faucet_tip2") },
    { icon: <Zap size={14} className="text-amber-400" />,        text: t("faucet_tip3") },
    { icon: <TestTube2 size={14} className="text-sky-400" />,    text: t("faucet_tip4") },
    { icon: <ExternalLink size={14} className="text-green-400" />, text: t("faucet_tip5") },
  ];

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold mb-5">
            <FlaskConical size={13} />
            {t("faucet_badge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("faucet_title")}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t("faucet_subtitle")}
          </p>
        </div>

        {/* Warning: not on testnet */}
        {!isTestnet && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">{t("faucet_warn_title")}</p>
              <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">{t("faucet_warn_desc")}</p>
            </div>
          </div>
        )}

        {/* Faucet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">

          {/* ETH Faucet */}
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Droplets size={16} className="text-sky-400" />
                  <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">{t("faucet_eth_label")}</span>
                </div>
                <p className="text-2xl font-bold text-white">0.0001 ETH</p>
                <p className="text-xs text-white/40 mt-0.5">{t("faucet_eth_sub")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30">{t("faucet_eth_network")}</p>
                <p className="text-xs text-orange-400 font-medium mt-0.5">Base Sepolia</p>
              </div>
            </div>

            <div className="h-px bg-white/6" />

            <p className="text-xs text-white/45 leading-relaxed">{t("faucet_eth_desc")}</p>

            {/* Claim controls */}
            {!isConnected ? (
              <div className="mt-auto rounded-xl bg-white/4 border border-white/8 px-3 py-3 text-center">
                <p className="text-xs text-white/40">{t("faucet_connect")}</p>
              </div>
            ) : !isTestnet ? (
              <div className="mt-auto rounded-xl bg-white/4 border border-white/8 px-3 py-3 text-center">
                <p className="text-xs text-white/40">{t("faucet_testnet_only")}</p>
              </div>
            ) : (
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{t("faucet_claims_used")}</span>
                  <span className="font-mono text-white/60">
                    {checking ? "—" : `${claimCount} / ${MAX_CLAIMS}`}
                  </span>
                </div>
                <div className="w-full bg-white/8 rounded-full h-1.5">
                  <div
                    className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((claimCount / MAX_CLAIMS) * 100, 100)}%` }}
                  />
                </div>
                {allClaimed ? (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <CheckCircle size={14} className="text-green-400" />
                    <span className="text-xs text-green-400 font-medium">{t("faucet_all_claimed", { max: MAX_CLAIMS })}</span>
                    {lastTx && (
                      <a href={lastTx} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors">
                        view tx <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={loading || checking}
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-50 text-black text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" /> {t("faucet_sending")}</>
                      : <><Droplets size={14} /> {t("faucet_btn")}</>
                    }
                  </button>
                )}
                {lastTx && !allClaimed && (
                  <a href={lastTx} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-sky-400 transition-colors justify-center">
                    <CheckCircle size={10} className="text-green-500/60" />
                    {t("faucet_last_tx")}
                  </a>
                )}
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              </div>
            )}
          </div>

          {/* USDC Faucet */}
          <a
            href={CIRCLE_FAUCET}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col gap-4 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <DollarSign size={16} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">{t("faucet_usdc_label")}</span>
                </div>
                <p className="text-2xl font-bold text-white">$20 USDC</p>
                <p className="text-xs text-white/40 mt-0.5">{t("faucet_usdc_sub")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30">{t("faucet_usdc_provider")}</p>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">Circle</p>
              </div>
            </div>

            <div className="h-px bg-white/6" />

            <p className="text-xs text-white/45 leading-relaxed">{t("faucet_usdc_desc")}</p>

            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors pt-1">
              <span>{t("faucet_usdc_btn")}</span>
              <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>
        </div>

        {/* How to get started */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5 flex items-center gap-2">
            <ArrowRight size={14} className="text-sky-400" />
            {t("faucet_steps_title")}
          </h2>
          <div className="space-y-3">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-4 bg-white/3 rounded-2xl px-4 py-4 border border-white/5 hover:border-white/8 transition-all">
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center">
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-white/20">{step.num}</span>
                    <p className="text-sm font-semibold text-white/80">{step.title}</p>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testing Tips */}
        <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/8 to-amber-500/3 p-6 mb-8">
          <h2 className="text-sm font-semibold text-amber-300/80 mb-5 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-400" />
            {t("faucet_tips_title")}
          </h2>
          <ul className="space-y-3.5">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{tip.icon}</span>
                <p className="text-xs text-white/50 leading-relaxed">{tip.text}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: t("nav_indexes"), href: "/indexes" },
            { label: t("nav_dashboard"), href: "/dashboard" },
            { label: t("nav_transparency"), href: "/transparency" },
            { label: t("nav_whats_new"), href: "/whats-new" },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 px-3 py-2.5 text-center text-xs text-white/50 hover:text-white/80 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/20 leading-relaxed">
          {t("faucet_footer")}
        </p>
      </div>
    </div>
  );
}
