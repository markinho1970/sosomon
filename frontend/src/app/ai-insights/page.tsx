"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAccount } from "wagmi";
import { indexApi, investApi } from "@/lib/api";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import type { AlphaIndex, InvestorInsight } from "@/types";

function fmtPct(v: number) {
  if (!v && v !== 0) return "—";
  const r = parseFloat(v.toFixed(2));
  if (r === 0) return "0.00%";
  return `${r > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function pctColor(v: number) {
  if (!v && v !== 0) return "text-white/30";
  if (parseFloat(v.toFixed(2)) === 0) return "text-white/30";
  return v > 0 ? "text-green-400" : "text-red-400";
}

export default function AiInsightsPage() {
  const { address, isConnected } = useAccount();
  const { networkMode } = useNetworkMode();

  const [indexes, setIndexes] = useState<AlphaIndex[]>([]);
  const [insights, setInsights] = useState<InvestorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const idxData = await indexApi.getAll(networkMode as "mainnet" | "testnet");
      setIndexes(idxData ?? []);

      if (isConnected && address) {
        const insData = await investApi.getInsights(address, networkMode);
        setInsights(insData.insights ?? []);
      } else {
        setInsights([]);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error("AI Insights load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [address, isConnected, networkMode]);

  const opportunities = insights.filter(i => i.type === "opportunity");
  const concentrations = insights.filter(i => i.type === "concentration");

  const sortedByPerf = [...indexes].sort((a, b) => (b.return_30d_pct ?? 0) - (a.return_30d_pct ?? 0));

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
              <Bot size={20} className="text-brand-orange" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Insights</h1>
              <p className="text-xs text-white/40 mt-0.5">
                Inteligência de médio prazo · Scout SoSoMon
                {lastUpdated && <span className="ml-2">· atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-white/20 text-sm">Carregando análise...</div>
        ) : (
          <div className="space-y-6">

            {/* Personalized insights — só se conectado */}
            {isConnected && address ? (
              <>
                {(opportunities.length > 0 || concentrations.length > 0) ? (
                  <div className="card border-brand-orange/15">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb size={14} className="text-brand-orange" />
                      <h2 className="text-sm font-semibold text-white">Insights personalizados</h2>
                      <span className="ml-auto text-xs text-white/30">{address.slice(0, 6)}…{address.slice(-4)}</span>
                    </div>

                    {opportunities.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3 mb-2">
                        <TrendingUp size={16} className="text-green-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80">{ins.message}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs">
                            <span className="text-green-400 font-mono">
                              {ins.outperformance_pct !== undefined ? `+${ins.outperformance_pct.toFixed(1)}% vs BTC` : ""}
                            </span>
                            <span className="text-white/30">30d: {fmtPct(ins.return_30d_pct ?? 0)}</span>
                            <Link href={`/indexes/${ins.index_slug}`} className="text-brand-orange hover:underline ml-auto">
                              ver índice →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {concentrations.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 mb-2">
                        <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80">{ins.message}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs">
                            {ins.hhi && <span className="text-white/40 font-mono">HHI={ins.hhi.toFixed(3)} · n_efetivo={ins.effective_n}</span>}
                            <Link href={`/indexes/${ins.index_slug}`} className="text-brand-orange hover:underline ml-auto">
                              ver risco →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {opportunities.length === 0 && concentrations.length === 0 && (
                      <p className="text-xs text-white/30 py-2 text-center">Sem alertas no momento — portfólio bem diversificado.</p>
                    )}
                  </div>
                ) : (
                  <div className="card border-green-500/10 bg-green-500/3 text-center py-6">
                    <p className="text-sm text-green-400/80">Portfólio em boa forma — sem oportunidades ou riscos identificados no momento.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="card border-dashed border-white/10 text-center py-8">
                <Bot size={24} className="text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/40 mb-4">Conecte sua carteira para ver insights personalizados</p>
                <Link href="/" className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2">
                  Conectar carteira
                </Link>
              </div>
            )}

            {/* Market Intelligence — geral, sempre visível */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-white/40" />
                <h2 className="text-sm font-semibold text-white">Performance dos índices</h2>
                <span className="ml-auto text-xs text-white/20">vs BTC benchmark</span>
              </div>

              <div className="space-y-3">
                {sortedByPerf.map(idx => {
                  const r30 = idx.return_30d_pct ?? 0;
                  const r7  = idx.return_7d_pct ?? 0;
                  const btc = idx.btc_benchmark_30d ?? 0;
                  const outperf = r30 - btc;
                  const isBeating = outperf > 0;

                  return (
                    <div key={idx.id} className="bg-white/3 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Link href={`/indexes/${idx.slug}`} className="text-sm font-semibold text-white hover:text-brand-orange transition-colors">
                            {idx.name}
                          </Link>
                          <p className="text-xs text-white/30 mt-0.5">NAV ${(idx.nav_usd ?? 0).toFixed(4)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                          isBeating
                            ? "text-green-400 border-green-500/30 bg-green-500/8"
                            : "text-red-400 border-red-500/30 bg-red-500/8"
                        }`}>
                          {isBeating ? "▲" : "▼"} {Math.abs(outperf).toFixed(1)}% vs BTC
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">7 dias</p>
                          <p className={`text-sm font-mono font-semibold ${pctColor(r7)}`}>{fmtPct(r7)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">30 dias</p>
                          <p className={`text-sm font-mono font-semibold ${pctColor(r30)}`}>{fmtPct(r30)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">BTC 30d</p>
                          <p className={`text-sm font-mono font-semibold ${pctColor(btc)}`}>{fmtPct(btc)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-white/20 text-center px-4">
              Insights gerados pelo Scout SoSoMon com dados reais do SoDEX e SoSoValue SSI.
              Não constituem recomendação de investimento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
