import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number, showSign = true, decimals = 2): string {
  const r = parseFloat(value.toFixed(decimals));
  if (r === 0) return `0.${"0".repeat(decimals)}%`;
  const sign = showSign && r > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function pctColor(value: number, decimals = 1, zeroClass = "text-white"): string {
  if (parseFloat(value.toFixed(decimals)) === 0) return zeroClass;
  return value > 0 ? "text-green-400" : "text-red-400";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function getSentimentColor(score: number): string {
  if (score <= 25) return "text-red-400";
  if (score <= 45) return "text-orange-400";
  if (score <= 55) return "text-yellow-400";
  if (score <= 75) return "text-green-400";
  return "text-emerald-400";
}

export function getSentimentLabel(score: number): string {
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Greed";
  return "Extreme Greed";
}

export function getThemeLabel(theme: string): string {
  const map: Record<string, string> = {
    "ai-crypto": "AI x Crypto",
    rwa: "Real World Assets",
    depin: "DePIN",
    defi: "DeFi",
    custom: "Custom",
  };
  return map[theme] ?? theme;
}

export function getThemeColor(theme: string): string {
  const map: Record<string, string> = {
    "ai-crypto": "text-purple-400 bg-purple-500/10 border-purple-500/20",
    rwa: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    depin: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    defi: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    custom: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  return map[theme] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";
}
