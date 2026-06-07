"use client";

import { Bot, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, FileText, ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useLang } from "@/lib/LanguageContext";
import type { AgentActivity } from "@/types";

const AGENT_LABELS: Record<string, string> = {
  scout: "Scout",
  rebalancer: "Rebalancer",
  narrator: "Narrator",
  deposit_monitor: "Monitor",
};

const AGENT_COLORS: Record<string, string> = {
  scout: "text-purple-400 bg-purple-500/10",
  rebalancer: "text-brand-blue bg-brand-blue/10",
  narrator: "text-emerald-400 bg-emerald-500/10",
  deposit_monitor: "text-yellow-400 bg-yellow-500/10",
};

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "inclusion":
    case "weight_increase":
      return <TrendingUp size={14} className="text-green-400" />;
    case "exclusion":
    case "weight_decrease":
      return <TrendingDown size={14} className="text-red-400" />;
    case "risk_override":
      return <AlertTriangle size={14} className="text-yellow-400" />;
    case "rebalance":
      return <RefreshCw size={14} className="text-brand-blue" />;
    case "content_generated":
      return <FileText size={14} className="text-emerald-400" />;
    case "deposit_detected":
      return <ArrowDownCircle size={14} className="text-green-400" />;
    case "deposit_refunded":
      return <RotateCcw size={14} className="text-orange-400" />;
    case "withdrawal_executed":
      return <ArrowUpCircle size={14} className="text-red-400" />;
    default:
      return <Bot size={14} className="text-white/40" />;
  }
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  maxItems?: number;
}

function getMonitorDesc(activity: AgentActivity, t: (k: string) => string): string {
  const d = (activity.data ?? {}) as Record<string, unknown>;
  const amount = typeof d.amount_usd === "number" ? d.amount_usd.toFixed(2) : "?";
  const wallet = typeof d.from === "string" ? `${d.from.slice(0, 6)}…${d.from.slice(-4)}` : "?";
  const min = typeof d.minimum_usd === "number" ? d.minimum_usd.toFixed(0) : "5";
  const refund_ok = d.refund_ok;
  const tx = typeof d.tx_hash === "string" ? d.tx_hash.slice(0, 12) + "…" : "";
  const refundTx = typeof d.refund_tx === "string" && d.refund_tx ? d.refund_tx.slice(0, 12) + "…" : "";

  switch (activity.action) {
    case "deposit_detected": {
      const index = typeof activity.index_id === "string" ? activity.index_id : "";
      const base = t("act_deposit_ok").replace("${amount}", amount).replace("{wallet}", wallet);
      return index ? `${base} → ${index}${tx ? ` | ${tx}` : ""}` : base;
    }
    case "deposit_refunded": {
      const base = t("act_refund") + ` $${amount} USDC (${t("act_min")}: $${min})`;
      if (refund_ok === true) {
        const sent = t("act_refund_sent").replace("{wallet}", wallet);
        return `${base} — ${sent}${refundTx ? ` | ${refundTx}` : ""}`;
      }
      if (refund_ok === false) {
        return `${base} — ${t("act_refund_failed").replace("{wallet}", wallet)}`;
      }
      return `${base} — ${t("act_refund_pending").replace("{wallet}", wallet)}`;
    }
    case "withdrawal_executed":
      return t("act_withdrawal").replace("${amount}", amount);
    case "manual_credit":
      return t("act_manual").replace("${amount}", amount);
    default:
      return activity.description;
  }
}

export default function AgentActivityFeed({ activities, maxItems = 10 }: AgentActivityFeedProps) {
  const { t } = useLang();
  const items = activities.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-white/30 text-sm text-center py-6">{t("activity_empty")}</p>
      )}
      {items.map((activity) => {
        const desc = activity.agent === "deposit_monitor"
          ? getMonitorDesc(activity, t)
          : activity.description;
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
          >
            <div className="mt-0.5 flex-shrink-0">
              <ActionIcon action={activity.action} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${AGENT_COLORS[activity.agent] ?? "text-white/40 bg-white/5"}`}>
                  {AGENT_LABELS[activity.agent] ?? activity.agent}
                </span>
                {activity.token_symbol && (
                  <span className="text-xs font-mono text-white/60">{activity.token_symbol}</span>
                )}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
            </div>
            <span className="text-xs text-white/25 flex-shrink-0 mt-0.5">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
