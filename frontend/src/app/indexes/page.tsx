"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { INDEX_I18N } from "@/lib/i18n/translations";

interface IndexData {
  id: string; slug: string; name: string; theme: string; description: string;
  return_30d_pct: number; total_return_pct: number; aum_usd: number;
  nav_usd: number; subscriber_count: number; last_rebalanced_at: string | null;
  constituents: { symbol: string }[];
}

const THEME_COLORS: Record<string, string> = {
  "ai-crypto": "border-purple-500/20 bg-purple-500/5",
  rwa: "border-emerald-500/20 bg-emerald-500/5",
  depin: "border-cyan-500/20 bg-cyan-500/5",
};
const THEME_BADGE: Record<string, string> = {
  "ai-crypto": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  rwa: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  depin: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};
const THEME_LABELS: Record<string, string> = {
  "ai-crypto": "AI × Crypto", rwa: "Real World Assets", depin: "DePIN",
};

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function IndexesPage() {
  const { t, lang } = useLang();
  const { networkMode } = useNetworkMode();
  const [indexes, setIndexes] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/indexes?network_mode=${networkMode}`)
      .then(r => r.json())
      .then(d => setIndexes(d.data ?? []))
      .catch(() => setIndexes([]))
      .finally(() => setLoading(false));
  }, [networkMode]);

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-32 pb-24">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">{t("idx_title")}</h1>
          <p className="text-white/40 text-lg">{t("idx_sub")}</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">{t("idx_loading")}</div>
        ) : (
          <div className="space-y-4">
            {indexes.map((idx) => {
              const symbols = (idx.constituents ?? []).map((c) => c.symbol);
              return (
                <Link key={idx.slug} href={`/indexes/${idx.slug}`}>
                  <div className={`border rounded-xl p-6 hover:border-white/15 transition-all duration-200 cursor-pointer group ${THEME_COLORS[idx.theme] ?? "border-white/10"}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <span className={`badge text-xs mb-2 inline-flex ${THEME_BADGE[idx.theme] ?? "bg-white/5 text-white/40"}`}>
                          {THEME_LABELS[idx.theme] ?? idx.theme}
                        </span>
                        <h2 className="text-xl font-semibold text-white group-hover:text-brand-blue transition-colors mb-1">
                          {INDEX_I18N[idx.slug]?.[lang]?.name ?? idx.name}
                        </h2>
                        <p className="text-sm text-white/40 mb-3 leading-relaxed max-w-xl">
                          {INDEX_I18N[idx.slug]?.[lang]?.description ?? idx.description}
                        </p>
                        <div className="flex gap-1.5 flex-wrap">
                          {symbols.slice(0, 6).map((t) => (
                            <span key={t} className="text-xs font-mono bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                          {symbols.length > 6 && <span className="text-xs text-white/20 py-0.5">+{symbols.length - 6}</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-6 md:gap-8 shrink-0">
                        <div>
                          <p className="stat-label text-xs">{t("idx_aum")}</p>
                          <p className="text-white font-semibold">{fmt(idx.aum_usd ?? 0)}</p>
                        </div>
                        <div>
                          <p className="stat-label text-xs">{t("idx_nav")}</p>
                          <p className="text-white font-semibold">${(idx.nav_usd ?? 1).toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="stat-label text-xs">{t("idx_30d")}</p>
                          <p className={`font-bold text-lg ${(idx.return_30d_pct ?? 0) > 0 ? "text-green-400" : (idx.return_30d_pct ?? 0) < 0 ? "text-red-400" : "text-white"}`}>
                            {(idx.return_30d_pct ?? 0) > 0 ? "+" : ""}{(idx.return_30d_pct ?? 0).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="stat-label text-xs">{t("idx_alltime")}</p>
                          <p className={`font-semibold ${(idx.total_return_pct ?? 0) > 0 ? "text-green-400" : (idx.total_return_pct ?? 0) < 0 ? "text-red-400" : "text-white"}`}>
                            {(idx.total_return_pct ?? 0) > 0 ? "+" : ""}{(idx.total_return_pct ?? 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-white/20 group-hover:text-brand-blue transition-colors hidden md:block shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
