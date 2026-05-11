"use client";

import { getSentimentColor, getSentimentLabel } from "@/lib/utils";
import type { MacroData } from "@/types";

interface MacroWidgetProps {
  macro: MacroData;
}

const STANCE_STYLES = {
  "risk-on": "text-green-400 bg-green-500/10 border-green-500/20",
  "risk-neutral": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "risk-off": "text-red-400 bg-red-500/10 border-red-500/20",
};

const STANCE_LABELS = {
  "risk-on": "Risk-On",
  "risk-neutral": "Risk-Neutral",
  "risk-off": "Risk-Off",
};

export default function MacroWidget({ macro }: MacroWidgetProps) {
  const sentimentColor = getSentimentColor(macro.sosovalue_sentiment_score);
  const sentimentLabel = getSentimentLabel(macro.sosovalue_sentiment_score);
  const stanceStyle = STANCE_STYLES[macro.macro_stance];

  return (
    <div className="space-y-4">
      {/* Sentiment Score */}
      <div>
        <p className="stat-label mb-2">SoSoValue Sentiment</p>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-bold ${sentimentColor}`}>
            {macro.sosovalue_sentiment_score}
          </span>
          <span className={`text-sm font-medium mb-1 ${sentimentColor}`}>
            {sentimentLabel}
          </span>
        </div>
        {/* Bar */}
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-400 opacity-80"
            style={{ width: `${macro.sosovalue_sentiment_score}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/20 mt-1">
          <span>Fear</span>
          <span>Greed</span>
        </div>
      </div>

      {/* Macro Stance */}
      <div>
        <p className="stat-label mb-2">AI Macro Stance</p>
        <div className="flex items-center gap-2">
          <span className={`badge border font-medium text-sm px-3 py-1 ${stanceStyle}`}>
            {STANCE_LABELS[macro.macro_stance]}
          </span>
        </div>
        <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
          {macro.macro_stance_reason}
        </p>
      </div>

      {/* Sector Flows */}
      <div>
        <p className="stat-label mb-2">Sector Flows (7d)</p>
        <div className="space-y-1.5">
          {macro.sector_flows.map((s) => (
            <div key={s.sector} className="flex items-center justify-between">
              <span className="text-xs text-white/50">{s.sector}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-medium ${
                    s.flow_7d === "inflow"
                      ? "text-green-400"
                      : s.flow_7d === "outflow"
                      ? "text-red-400"
                      : "text-white/40"
                  }`}
                >
                  {s.flow_7d === "inflow" ? "▲" : s.flow_7d === "outflow" ? "▼" : "—"}{" "}
                  {Math.abs(s.change_pct).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
