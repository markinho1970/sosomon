import Link from "next/link";
import Navbar from "../components/Navbar";
import { ArrowRight } from "lucide-react";

const INDEXES = [
  {
    slug: "ai-crypto-infrastructure",
    name: "AI × Crypto Infrastructure",
    theme: "ai-crypto",
    description: "Top AI-native protocols powering the next compute layer. Focuses on AI inference, compute marketplaces, and data networks built on crypto rails.",
    return_30d_pct: 24.7,
    total_return_pct: 68.3,
    aum_usd: 520_000,
    nav_usd: 1.683,
    subscriber_count: 84,
    last_rebalanced: "2 days ago",
    constituents: ["RNDR", "FET", "TAO", "AGIX", "GRT", "OCEAN", "NMR", "AKT", "HMT", "ALI"],
  },
  {
    slug: "real-world-assets-top10",
    name: "Real World Assets Top 10",
    theme: "rwa",
    description: "Leading tokenized RWA protocols bridging traditional finance and DeFi. Includes real estate, bonds, commodities, and credit protocols.",
    return_30d_pct: 14.2,
    total_return_pct: 41.7,
    aum_usd: 390_000,
    nav_usd: 1.417,
    subscriber_count: 63,
    last_rebalanced: "3 days ago",
    constituents: ["ONDO", "MKR", "CENTRIFUGE", "TRU", "CPOOL", "MPL", "DUSK", "RIO", "PROPS", "ARTFI"],
  },
  {
    slug: "depin-momentum",
    name: "DePIN Momentum",
    theme: "depin",
    description: "Decentralized physical infrastructure networks with real-world traction. Targets wireless, energy, logistics, and compute DePIN projects.",
    return_30d_pct: 31.1,
    total_return_pct: 89.4,
    aum_usd: 330_000,
    nav_usd: 1.894,
    subscriber_count: 40,
    last_rebalanced: "1 day ago",
    constituents: ["HNT", "MOBILE", "IOT", "IOTX", "POWR", "DIMO", "REACT", "GEODNET", "SILENCIO", "WICRYPT"],
  },
];

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
  "ai-crypto": "AI × Crypto",
  rwa: "Real World Assets",
  depin: "DePIN",
};

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export default function IndexesPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-32 pb-24">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">All Indexes</h1>
          <p className="text-white/40 text-lg">
            AI-managed thematic portfolios. Rebalanced by agents, verified on SoSoValue ValueChain.
          </p>
        </div>

        <div className="space-y-4">
          {INDEXES.map((idx) => (
            <Link key={idx.slug} href={`/indexes/${idx.slug}`}>
              <div
                className={`border rounded-xl p-6 hover:border-white/15 transition-all duration-200 cursor-pointer group ${THEME_COLORS[idx.theme]}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left */}
                  <div className="flex-1">
                    <span className={`badge text-xs mb-2 inline-flex ${THEME_BADGE[idx.theme]}`}>
                      {THEME_LABELS[idx.theme]}
                    </span>
                    <h2 className="text-xl font-semibold text-white group-hover:text-brand-blue transition-colors mb-1">
                      {idx.name}
                    </h2>
                    <p className="text-sm text-white/40 mb-3 leading-relaxed max-w-xl">
                      {idx.description}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {idx.constituents.slice(0, 6).map((t) => (
                        <span key={t} className="text-xs font-mono bg-white/5 text-white/40 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                      {idx.constituents.length > 6 && (
                        <span className="text-xs text-white/20 py-0.5">+{idx.constituents.length - 6}</span>
                      )}
                    </div>
                  </div>

                  {/* Right stats */}
                  <div className="grid grid-cols-4 gap-6 md:gap-8 shrink-0">
                    <div>
                      <p className="stat-label text-xs">AUM</p>
                      <p className="text-white font-semibold">{fmt(idx.aum_usd)}</p>
                    </div>
                    <div>
                      <p className="stat-label text-xs">NAV</p>
                      <p className="text-white font-semibold">${idx.nav_usd.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="stat-label text-xs">30d Return</p>
                      <p className={`font-bold text-lg ${idx.return_30d_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        +{idx.return_30d_pct}%
                      </p>
                    </div>
                    <div>
                      <p className="stat-label text-xs">All-Time</p>
                      <p className={`font-semibold ${idx.total_return_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        +{idx.total_return_pct}%
                      </p>
                    </div>
                  </div>

                  <ArrowRight size={18} className="text-white/20 group-hover:text-brand-blue transition-colors hidden md:block shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
