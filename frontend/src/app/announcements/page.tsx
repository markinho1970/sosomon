"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Info, RefreshCw, Megaphone, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { announcementApi } from "@/lib/api";
import type { Announcement } from "@/types";

// Símbolos que estão NAS CESTAS da SoSoMon (qualquer índice)
const BASKET_SYMBOLS = new Set([
  "DEFI", "DEFIssi", "MAG7ssi", "MAG7", "USSIssi", "USSI",
  "AAVE", "UNI", "LINK", "ETH", "SOL", "BTC", "XAUt", "WSOSO",
]);

function inBasket(symbols: string[]) {
  return symbols.some(s => BASKET_SYMBOLS.has(s));
}

function impactAnalysis(ann: Announcement): { relevant: boolean; impact: string; action: string | null } {
  const title = ann.title.toLowerCase();
  const syms = ann.affects_symbols;
  const relevant = inBasket(syms);

  if (ann.severity === "critical" && title.includes("delist")) {
    if (relevant) {
      return {
        relevant: true,
        impact: `Token ${syms.join(", ")} afetado está presente nos índices da SoSoMon. Delisting significa que o SoDEX irá encerrar o mercado spot — posições existentes precisam ser liquidadas antes da data limite.`,
        action: "Verifique a data de encerramento e acompanhe as propostas de rebalanceamento. O Scout irá detectar e propor a remoção nas próximas análises.",
      };
    }
    return {
      relevant: false,
      impact: `Delisting de ${syms.length > 0 ? syms.join(", ") : "token não rastreado"}. Nenhum dos tokens afetados está nas cestas ativas da SoSoMon.`,
      action: null,
    };
  }

  if (title.includes("listing") || title.includes("new listing")) {
    if (relevant) {
      return {
        relevant: true,
        impact: `Novo mercado envolvendo ${syms.join(", ")}, presente nos índices. Aumento de liquidez pode impactar o spread e a qualidade de execução das ordens.`,
        action: "Nenhuma ação imediata necessária. O Scout considera volume e liquidez na próxima análise.",
      };
    }
    return {
      relevant: false,
      impact: "Novo token listado no SoDEX que não integra nenhuma das cestas atuais. Pode ser candidato futuro para o Scout avaliar.",
      action: null,
    };
  }

  if (title.includes("upgrade") || title.includes("mainnet upgrade")) {
    return {
      relevant: false,
      impact: "Manutenção de infraestrutura do SoDEX. Pode causar brevíssima interrupção nas APIs durante a janela de upgrade.",
      action: null,
    };
  }

  if (title.includes("perp") || title.includes("perps")) {
    return {
      relevant: false,
      impact: "Lançamento ou encerramento de mercado de derivativos (perpetual). A SoSoMon opera exclusivamente no mercado spot — sem impacto direto.",
      action: null,
    };
  }

  if (title.includes("vault") || title.includes("margin") || title.includes("collateral")) {
    return {
      relevant: false,
      impact: "Novo produto financeiro ou atualização de margem no SoDEX. Não afeta as operações spot da SoSoMon.",
      action: null,
    };
  }

  if (relevant) {
    return {
      relevant: true,
      impact: `Anúncio envolve ${syms.join(", ")}, presente(s) nos índices da SoSoMon. Avalie o contexto para determinar se há impacto nas posições.`,
      action: "Monitore os próximos ciclos do Scout para verificar se há recomendação de ajuste.",
    };
  }

  return {
    relevant: false,
    impact: "Comunicado geral do SoDEX sem impacto direto nos índices ou operações da SoSoMon.",
    action: null,
  };
}

function severityIcon(severity: Announcement["severity"]) {
  if (severity === "critical") return <AlertTriangle size={15} className="text-red-400 shrink-0" />;
  if (severity === "warning")  return <AlertTriangle size={15} className="text-yellow-400 shrink-0" />;
  return <Info size={15} className="text-blue-400/60 shrink-0" />;
}

function severityBadge(severity: Announcement["severity"]) {
  if (severity === "critical")
    return <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Critical</span>;
  if (severity === "warning")
    return <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">Aviso</span>;
  return <span className="text-xs font-medium uppercase tracking-wider text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">Info</span>;
}

function cardBorder(severity: Announcement["severity"], relevant: boolean) {
  if (relevant) {
    if (severity === "critical") return "border-red-500/40 bg-red-500/5";
    if (severity === "warning")  return "border-yellow-500/30 bg-yellow-500/5";
    return "border-amber-500/20 bg-amber-500/5";
  }
  return "border-white/8 bg-white/[0.02]";
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function monthKey(iso: string | null) {
  if (!iso) return "Sem data";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const { relevant, impact, action } = impactAnalysis(ann);
  const dateStr = fmtDate(ann.published_at || ann.created_at);

  return (
    <div className={`rounded-xl border transition-all ${cardBorder(ann.severity, relevant)}`}>
      {/* Cabeçalho — sempre visível */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(v => !v)}
      >
        {severityIcon(ann.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-white text-sm font-medium leading-snug">{ann.title}</p>
            <span className="text-white/30 text-xs shrink-0 tabular-nums">{dateStr}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {severityBadge(ann.severity)}

            {relevant && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert size={10} /> Relevante SoSoMon
              </span>
            )}

            {!relevant && (
              <span className="text-xs text-white/20 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Sem impacto
              </span>
            )}

            {ann.affects_symbols.map(s => (
              <span key={s} className={`text-xs font-mono px-2 py-0.5 rounded-full border ${BASKET_SYMBOLS.has(s) ? "text-amber-300 bg-amber-500/10 border-amber-500/20" : "text-white/40 bg-white/5 border-white/10"}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-white/30">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Análise expandida */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          {ann.body && (
            <p className="text-white/50 text-xs leading-relaxed">{ann.body}</p>
          )}

          <div className="rounded-lg bg-white/5 border border-white/8 p-3 space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Análise de Impacto — SoSoMon</p>
            <p className="text-white/70 text-sm leading-relaxed">{impact}</p>
            {action && (
              <div className="flex items-start gap-2 mt-2 rounded bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs leading-relaxed">{action}</p>
              </div>
            )}
          </div>

          {ann.action_deadline && (
            <div className="flex items-center gap-2 text-orange-400 text-xs font-medium">
              <AlertTriangle size={12} />
              Prazo de ação: {fmtDate(ann.action_deadline)}
            </div>
          )}

          {ann.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {ann.labels.map(l => (
                <span key={l} className="text-xs text-white/20 px-2 py-0.5 rounded bg-white/5 border border-white/8">{l}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "relevant" | "critical" | "info">("all");

  useEffect(() => {
    announcementApi.getActive()
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = announcements.filter(a => {
    if (filter === "all") return true;
    if (filter === "relevant") return inBasket(a.affects_symbols);
    if (filter === "critical") return a.severity === "critical";
    if (filter === "info") return a.severity === "info";
    return true;
  });

  const groups: Record<string, Announcement[]> = {};
  for (const a of filtered) {
    const key = monthKey(a.published_at || a.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }

  const criticalCount   = announcements.filter(a => a.severity === "critical").length;
  const relevantCount   = announcements.filter(a => inBasket(a.affects_symbols)).length;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-20">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone size={22} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Anúncios SoDEX</h1>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            Comunicados oficiais do SoDEX com análise de impacto para os índices SoSoMon.
            Clique em qualquer anúncio para ver a análise completa. Atualizado automaticamente a cada 2 horas.
          </p>
        </div>

        {/* Alertas de destaque */}
        {criticalCount > 0 && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm font-medium">
              {criticalCount} anúncio{criticalCount > 1 ? "s" : ""} crítico{criticalCount > 1 ? "s" : ""} ativo{criticalCount > 1 ? "s" : ""}.
              {relevantCount > 0 && ` ${relevantCount} com impacto potencial nos índices — verifique.`}
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { id: "all",      label: `Todos (${announcements.length})` },
            { id: "relevant", label: `Relevantes SoSoMon (${relevantCount})` },
            { id: "critical", label: `Críticos (${criticalCount})` },
            { id: "info",     label: `Info (${announcements.filter(a => a.severity === "info").length})` },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === f.id
                  ? f.id === "critical"  ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : f.id === "relevant" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista agrupada por mês */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30 gap-2">
            <RefreshCw size={16} className="animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/20 text-sm">Nenhum anúncio encontrado.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([month, items]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-white/40 text-xs font-semibold uppercase tracking-widest capitalize">{month}</span>
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-white/20 text-xs">{items.length} anúncio{items.length > 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {items.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-white/30 hover:text-white/60 text-xs transition-colors">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
