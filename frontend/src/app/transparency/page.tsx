"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot, ExternalLink, RefreshCw, Shield, Eye,
  TrendingUp, TrendingDown, AlertTriangle, FileText,
  Layers, Search, Cpu,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { agentApi } from "@/lib/api";
import { useLang } from "@/lib/LanguageContext";
import type { AgentActivity } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Deposit {
  tx_hash: string;
  from_address: string;
  amount_usd: number;
  block_number: number;
  timestamp: string;
  basescan_url: string;
  index_name: string;
}

const AGENT_META: Record<string, { label: string; color: string; icon: React.ReactNode; descKey: string }> = {
  scout: {
    label: "Scout Agent",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/5",
    icon: <Search size={14} />,
    descKey: "transp_scout_desc",
  },
  rebalancer: {
    label: "Rebalancer Agent",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    icon: <Cpu size={14} />,
    descKey: "transp_rebalancer_desc",
  },
  narrator: {
    label: "Narrator Agent",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    icon: <FileText size={14} />,
    descKey: "transp_narrator_desc",
  },
  deposit_monitor: {
    label: "Deposit Monitor",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
    icon: <Layers size={14} />,
    descKey: "transp_monitor_desc",
  },
};

function ActionIcon({ action }: { action: string }) {
  if (action.includes("inclusion") || action.includes("increase")) return <TrendingUp size={13} className="text-green-400" />;
  if (action.includes("exclusion") || action.includes("decrease")) return <TrendingDown size={13} className="text-red-400" />;
  if (action.includes("risk") || action.includes("override")) return <AlertTriangle size={13} className="text-yellow-400" />;
  if (action.includes("rebalance")) return <RefreshCw size={13} className="text-blue-400" />;
  if (action.includes("deposit")) return <Layers size={13} className="text-cyan-400" />;
  return <Bot size={13} className="text-white/40" />;
}

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
  } catch {
    return ts;
  }
}

export default function TransparencyPage() {
  const { t } = useLang();
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"decisions" | "deposits">("decisions");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      agentApi.getRecentActivity(100),
      fetch(`${API}/api/audit/deposits`).then((r) => r.json()).catch(() => ({ deposits: [] })),
    ]).then(([acts, dep]) => {
      setActivities(acts ?? []);
      setDeposits(dep.deposits ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? activities : activities.filter((a) => a.agent === filter);

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={20} className="text-brand-blue" />
            <span className="text-brand-blue text-sm font-medium uppercase tracking-wider">{t("transp_log")}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("transp_title")}</h1>
          <p className="text-white/50 max-w-xl">
            {t("transp_sub")}
          </p>
        </div>

        {/* How agents work */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {Object.entries(AGENT_META).map(([key, meta]) => (
            <div key={key} className={`rounded-xl p-4 border ${meta.color}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {meta.icon}
                <span className="text-sm font-semibold">{meta.label}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{t(meta.descKey)}</p>
            </div>
          ))}
        </div>

        {/* Sentiment score formula */}
        <div className="card mb-6 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-yellow-400" />
            <h2 className="font-semibold text-white">{t("transp_sentiment")}</h2>
          </div>
          <div className="bg-white/3 rounded-lg p-4 font-mono text-sm text-white/70 space-y-1">
            <p className="text-white">Score (0–100) = weighted average of:</p>
            <p>  • SoSoValue Crypto Greed &amp; Fear Index  <span className="text-brand-blue">× 40%</span></p>
            <p>  • Bitcoin 30-day momentum (normalized) <span className="text-brand-blue">× 25%</span></p>
            <p>  • Theme SSI Index 7d ROI (normalized)  <span className="text-brand-blue">× 20%</span></p>
            <p>  • Altcoin market breadth (% above MA20) <span className="text-brand-blue">× 15%</span></p>
            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/40">
              <p>≤ 20 = Extreme Fear → 30% USDC buffer applied</p>
              <p>≤ 40 = Fear → 15% USDC buffer applied</p>
              <p>41–60 = Neutral → 5% USDC buffer applied</p>
              <p>61–80 = Greed → 0% buffer, full allocation</p>
              <p>≥ 81 = Extreme Greed → trailing stop tightened</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white/3 rounded-xl p-1 w-fit">
          {(["decisions", "deposits"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-brand-blue text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {tab === "decisions"
                ? `${t("transp_tab_decisions")} (${activities.length})`
                : `${t("transp_tab_deposits")} (${deposits.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30">
            <RefreshCw size={20} className="animate-spin mr-2" /> {t("transp_loading")}
          </div>
        ) : (
          <>
            {activeTab === "decisions" && (
              <div className="space-y-3">
                {/* Agent filter */}
                <div className="flex gap-2 flex-wrap">
                  {["all", "scout", "rebalancer", "narrator", "deposit_monitor"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        filter === f
                          ? "bg-brand-blue border-brand-blue text-white"
                          : "border-white/10 text-white/40 hover:text-white"
                      }`}
                    >
                      {f === "all" ? t("transp_filter_all") : AGENT_META[f]?.label ?? f}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <p className="text-center text-white/30 py-12">{t("transp_no_decisions")}</p>
                )}

                {filtered.map((a) => (
                  <div key={a.id} className="card border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <ActionIcon action={a.action} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${AGENT_META[a.agent]?.color ?? "text-white/40 border-white/10"}`}>
                            {AGENT_META[a.agent]?.label ?? a.agent}
                          </span>
                          <span className="text-xs text-white/30 font-mono">{a.action}</span>
                          {a.token_symbol && (
                            <span className="text-xs font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded">{a.token_symbol}</span>
                          )}
                          <span className="ml-auto text-xs text-white/25">{fmtTime(a.timestamp)}</span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">{a.description}</p>

                        {a.data && Object.keys(a.data).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-white/30 hover:text-white/50 cursor-pointer">
                              {t("transp_data_inputs")}
                            </summary>
                            <pre className="mt-2 text-xs text-white/40 bg-black/30 rounded-lg p-3 overflow-x-auto leading-relaxed">
                              {JSON.stringify(a.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "deposits" && (
              <div className="space-y-3">
                {deposits.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/30 text-sm">{t("transp_no_deposits")}</p>
                    <p className="text-white/20 text-xs mt-1">{t("transp_deposits_note")}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/30 mb-2">{t("transp_verifiable")}</p>
                    {deposits.map((d) => (
                      <div key={d.tx_hash} className="card border border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers size={13} className="text-cyan-400" />
                              <span className="text-sm font-semibold text-white">
                                ${d.amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
                              </span>
                              <span className="text-xs text-white/30">→ {d.index_name}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/40">
                              <span>From: <span className="font-mono">{d.from_address.slice(0, 10)}…{d.from_address.slice(-6)}</span></span>
                              <span>Block: {d.block_number.toLocaleString()}</span>
                              <span>{fmtTime(d.timestamp)}</span>
                            </div>
                            <p className="font-mono text-xs text-white/25 mt-1 break-all">{d.tx_hash}</p>
                          </div>
                          <a
                            href={d.basescan_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all shrink-0"
                          >
                            <ExternalLink size={12} />
                            Basescan
                          </a>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-white/20 space-y-1">
          <p>{t("transp_footer1")}</p>
          <p>{t("transp_footer2")}</p>
          <Link href="/" className="text-white/30 hover:text-white transition-colors">{t("transp_back")}</Link>
        </div>
      </main>
    </div>
  );
}
