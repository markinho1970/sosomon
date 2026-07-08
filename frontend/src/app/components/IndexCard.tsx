"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Users, RefreshCw } from "lucide-react";
import { formatUSD, formatPct, formatRelativeTime, getThemeLabel, getThemeColor, pctColor, cn } from "@/lib/utils";
import { useLang } from "@/lib/LanguageContext";
import type { AlphaIndex } from "@/types";

interface IndexCardProps {
  index: AlphaIndex;
}

export default function IndexCard({ index }: IndexCardProps) {
  const { t } = useLang();
  const isPositive = parseFloat(index.return_30d_pct.toFixed(2)) > 0;
  const retColor = (v: number) => pctColor(v, 2);
  const themeStyle = getThemeColor(index.theme);

  return (
    <Link href={`/indexes/${index.slug}`}>
      <div className="card hover:border-white/10 hover:bg-brand-gray/80 transition-all duration-200 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={cn("badge border text-xs mb-2 inline-flex", themeStyle)}>
              {getThemeLabel(index.theme)}
            </span>
            <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-brand-blue transition-colors">
              {index.name}
            </h3>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            retColor(index.return_30d_pct)
          )}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatPct(index.return_30d_pct)}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="stat-label text-xs">{t("idx_aum")}</p>
            <p className="font-semibold text-white text-sm">{formatUSD(index.aum_usd, true)}</p>
          </div>
          <div>
            <p className="stat-label text-xs">{t("idx_nav")}</p>
            <p className="font-semibold text-white text-sm">{formatUSD(index.nav_usd)}</p>
          </div>
          <div>
            <p className="stat-label text-xs">{t("idx_alltime")}</p>
            <p className={cn("font-semibold text-sm", retColor(index.total_return_pct))}>
              {formatPct(index.total_return_pct)}
            </p>
          </div>
        </div>

        {/* vs BTC */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-4">
          <span>vs BTC 30d: <span className={retColor(index.return_30d_pct - index.btc_benchmark_30d)}>
            {formatPct(index.return_30d_pct - index.btc_benchmark_30d)} alpha
          </span></span>
          <span>{index.constituents.length} tokens</span>
        </div>

        {/* Constituents preview */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {index.constituents.slice(0, 5).map((token) => (
            <span key={token.symbol} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full font-mono">
              {token.symbol}
            </span>
          ))}
          {index.constituents.length > 5 && (
            <span className="text-xs text-white/30 px-2 py-0.5">
              +{index.constituents.length - 5}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-white/30">
          <div className="flex items-center gap-1">
            <RefreshCw size={11} />
            <span>{t("perf_rebalanced")} {formatRelativeTime(index.last_rebalanced_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={11} />
            <span>{index.subscriber_count} {t("idx_subscribers")}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
