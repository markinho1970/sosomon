"use client";

import { Bot, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { AgentActivity } from "@/types";

const AGENT_LABELS: Record<string, string> = {
  scout: "Scout",
  rebalancer: "Rebalancer",
  narrator: "Narrator",
};

const AGENT_COLORS: Record<string, string> = {
  scout: "text-purple-400 bg-purple-500/10",
  rebalancer: "text-brand-blue bg-brand-blue/10",
  narrator: "text-emerald-400 bg-emerald-500/10",
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
    default:
      return <Bot size={14} className="text-white/40" />;
  }
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  maxItems?: number;
}

export default function AgentActivityFeed({ activities, maxItems = 10 }: AgentActivityFeedProps) {
  const items = activities.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-white/30 text-sm text-center py-6">No recent agent activity.</p>
      )}
      {items.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
        >
          <div className="mt-0.5 flex-shrink-0">
            <ActionIcon action={activity.action} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${AGENT_COLORS[activity.agent]}`}>
                {AGENT_LABELS[activity.agent]}
              </span>
              {activity.token_symbol && (
                <span className="text-xs font-mono text-white/60">{activity.token_symbol}</span>
              )}
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{activity.description}</p>
          </div>
          <span className="text-xs text-white/25 flex-shrink-0 mt-0.5">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
