import Link from "next/link";
import { TrendingUp, TrendingDown, Users, RefreshCw } from "lucide-react";
import { formatUSD, formatPct, formatRelativeTime, getThemeLabel, getThemeColor, cn } from "@/lib/utils";
import type { AlphaIndex } from "@/types";

interface IndexCardProps {
  index: AlphaIndex;
}

export default function IndexCard({ index }: IndexCardProps) {
  const isPositive = index.return_30d_pct >= 0;
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
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatPct(index.return_30d_pct)}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="stat-label text-xs">AUM</p>
            <p className="font-semibold text-white text-sm">{formatUSD(index.aum_usd, true)}</p>
          </div>
          <div>
            <p className="stat-label text-xs">NAV</p>
            <p className="font-semibold text-white text-sm">{formatUSD(index.nav_usd)}</p>
          </div>
          <div>
            <p className="stat-label text-xs">All-Time</p>
            <p className={cn("font-semibold text-sm", index.total_return_pct >= 0 ? "text-green-400" : "text-red-400")}>
              {formatPct(index.total_return_pct)}
            </p>
          </div>
        </div>

        {/* vs BTC */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-4">
          <span>vs BTC 30d: <span className={index.return_30d_pct - index.btc_benchmark_30d >= 0 ? "text-green-400" : "text-red-400"}>
            {formatPct(index.return_30d_pct - index.btc_benchmark_30d)} alpha
          </span></span>
          <span>{index.constituents.length} tokens</span>
        </div>

        {/* Constituents preview */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {index.constituents.slice(0, 5).map((t) => (
            <span key={t.symbol} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full font-mono">
              {t.symbol}
            </span>
          ))}
          {index.constituents.length > 5 && (
            <span className="text-xs text-white/30 px-2 py-0.5">
              +{index.constituents.length - 5} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-white/30">
          <div className="flex items-center gap-1">
            <RefreshCw size={11} />
            <span>Rebalanced {formatRelativeTime(index.last_rebalanced_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={11} />
            <span>{index.subscriber_count} investors</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
