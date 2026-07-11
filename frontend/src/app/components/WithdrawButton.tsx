"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  TrendingUp, TrendingDown, ExternalLink, FlaskConical, Info,
} from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/lib/LanguageContext";
import { useNetworkMode } from "@/lib/NetworkModeContext";

interface Props {
  indexId: string;
  indexName: string;
  currentValueUsd: number;
  navUsd: number;
  depositedUsd?: number;
}

interface Preview {
  withdrawal_requested: number;
  cost_basis_proportional: number;
  pnl_usd: number;
  pnl_pct: number;
  pnl_label: string;
  days_invested: number;
  management_fee_usd: number;
  performance_fee_usd: number;
  gas_fee_est_usd: number;
  total_fees_usd: number;
  net_usd: number;
  net_usd_label: string;
  current_portfolio_value: number;
  deposited_usd: number;
  is_full_withdrawal: boolean;
  warnings: string[];
  risks: string[];
  fees_breakdown: { management: string; performance: string; gas: string };
}

interface ExecResult {
  success: boolean;
  simulate: boolean;
  tx_hash?: string;
  basescan?: string;
  net_usd: number;
  pnl_usd: number;
  pnl_pct: number;
  pnl_label: string;
  management_fee: number;
  performance_fee: number;
  warnings: string[];
  error?: string;
  checks?: Record<string, unknown>;
  message?: string;
}

type Step = "input" | "preview" | "confirm" | "processing" | "success" | "simulated" | "error";

function fmtUSD(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WithdrawButton({ indexId, indexName, currentValueUsd, navUsd, depositedUsd = 0 }: Props) {
  const { address } = useAccount();
  const { t } = useLang();
  const { networkMode } = useNetworkMode();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= 1 && amountNum <= currentValueUsd;

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setStep("input"); setAmount(""); setPreview(null); setResult(null); }, 300);
  }

  async function loadPreview() {
    if (!address || !isValid) return;
    setLoadingPreview(true);
    try {
      const { data } = await api.post("/api/invest/withdraw-preview", {
        wallet_address: address,
        index_id: indexId,
        amount_usd: amountNum,
        network_mode: networkMode,
      });
      setPreview(data);
      setStep("preview");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(detail || t("wd_preview_error"));
      setStep("error");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function execute(simulate: boolean) {
    if (!address || !preview) return;
    setStep("processing");
    try {
      const { data } = await api.post<ExecResult>("/api/invest/withdraw-execute", {
        wallet_address: address,
        index_id: indexId,
        amount_usd: amountNum,
        simulate,
        network_mode: networkMode,
      });
      setResult(data);
      if (!data.success) {
        setErrorMsg(data.error || t("wd_exec_failed"));
        setStep("error");
      } else if (simulate) {
        setStep("simulated");
      } else {
        setStep("success");
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(detail || t("wd_withdrawal_error"));
      setStep("error");
    }
  }

  if (currentValueUsd <= 0) return null;

  const profitTotal = currentValueUsd - depositedUsd;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost w-full text-sm">
        {t("wd_btn")}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-brand-gray border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-white">
                {t("wd_title", { index: indexName })}
              </Dialog.Title>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* ── STEP: input ─────────────────────────────────────────── */}
            {step === "input" && (
              <div className="space-y-4">
                {/* Current position summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/3 rounded-lg p-2.5">
                    <p className="text-xs text-white/30">{t("wd_deposited")}</p>
                    <p className="text-sm font-semibold text-white">{fmtUSD(depositedUsd)}</p>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2.5">
                    <p className="text-xs text-white/30">{t("wd_current")}</p>
                    <p className="text-sm font-semibold text-white">{fmtUSD(currentValueUsd)}</p>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2.5">
                    <p className="text-xs text-white/30">{t("wd_pnl")}</p>
                    <p className={`text-sm font-semibold flex items-center justify-center gap-1 ${profitTotal >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {profitTotal >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {fmtUSD(profitTotal)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/40 uppercase tracking-wider">{t("wd_amount_label")}</label>
                    <span className="text-xs text-white/30">
                      {t("wd_available")} <span className="text-white/60">{fmtUSD(currentValueUsd)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      max={currentValueUsd}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-blue/60"
                      placeholder="0.00"
                    />
                  </div>
                  {amountNum > 0 && !isValid && (
                    <p className="text-xs text-red-400 mt-1">
                      {amountNum < 1 ? t("wd_min") : t("wd_exceeds")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount((currentValueUsd * pct / 100).toFixed(2))}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <Info size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/70" dangerouslySetInnerHTML={{ __html: t("wd_before_exec_hint") }} />
                </div>

                <button
                  onClick={loadPreview}
                  disabled={!isValid || loadingPreview}
                  className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingPreview
                    ? <><Loader2 size={15} className="animate-spin" /> {t("transp_loading")}</>
                    : t("wd_preview_btn")}
                </button>
              </div>
            )}

            {/* ── STEP: preview ───────────────────────────────────────── */}
            {step === "preview" && preview && (
              <div className="space-y-4">
                <p className="text-xs text-white/40 uppercase tracking-wider">{t("wd_summary")}</p>

                {/* P&L block */}
                <div className={`rounded-xl p-4 border ${preview.pnl_usd >= 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {preview.pnl_usd >= 0 ? <TrendingUp size={15} className="text-green-400" /> : <TrendingDown size={15} className="text-red-400" />}
                    <span className={`font-semibold text-sm ${preview.pnl_usd >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {preview.pnl_label}: {fmtUSD(preview.pnl_usd)} ({preview.pnl_pct > 0 ? "+" : ""}{preview.pnl_pct.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-white/30">{t("wd_cost_basis")}</span><br /><span className="text-white">{fmtUSD(preview.cost_basis_proportional)}</span></div>
                    <div><span className="text-white/30">{t("wd_current_val")}</span><br /><span className="text-white">{fmtUSD(preview.withdrawal_requested)}</span></div>
                  </div>
                </div>

                {/* Fees breakdown */}
                <div className="bg-white/3 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{t("wd_fees")}</p>
                  {[
                    { label: t("wd_mgmt_fee"), value: preview.management_fee_usd, detail: preview.fees_breakdown.management },
                    { label: t("wd_perf_fee"), value: preview.performance_fee_usd, detail: preview.fees_breakdown.performance },
                    { label: t("wd_gas"), value: preview.gas_fee_est_usd, detail: preview.fees_breakdown.gas },
                  ].map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">{f.label}</span>
                        <span className={f.value > 0 ? "text-orange-400" : "text-white/30"}>{f.value > 0 ? fmtUSD(f.value) : "—"}</span>
                      </div>
                      <p className="text-xs text-white/25">{f.detail}</p>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-white/60">{t("wd_total_fees")}</span>
                    <span className="text-orange-400">{fmtUSD(preview.total_fees_usd)}</span>
                  </div>
                </div>

                {/* Net you receive */}
                <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/40">{t("wd_you_receive")}</p>
                    <p className="text-2xl font-bold text-white">{fmtUSD(preview.net_usd)}</p>
                    <p className="text-xs text-white/30">{t("wd_usdc_wallet")}</p>
                  </div>
                  <div className="text-right text-xs text-white/30">
                    <p>{t("wd_in_wallet").replace("{a}", address?.slice(0, 6) ?? "")}{address?.slice(-4)}</p>
                    <p className="mt-0.5">{t("wd_time_estimate")}</p>
                  </div>
                </div>

                {/* Warnings */}
                {preview.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {preview.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/8 border border-yellow-500/20">
                        <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-300/80">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {preview.risks.length > 0 && (
                  <details className="text-xs text-white/30">
                    <summary className="cursor-pointer hover:text-white/50">{t("wd_risks")}</summary>
                    <ul className="mt-2 space-y-1 pl-3">
                      {preview.risks.map((r, i) => <li key={i} className="list-disc list-inside">{r}</li>)}
                    </ul>
                  </details>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => execute(true)}
                    className="flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 transition-all"
                  >
                    <FlaskConical size={14} />
                    {t("wd_simulate")}
                  </button>
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={preview.net_usd <= 0}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("wd_execute")}
                  </button>
                </div>
                <button onClick={() => setStep("input")} className="text-xs text-white/30 hover:text-white/60 w-full text-center transition-colors">
                  {t("wd_back_confirm")}
                </button>
              </div>
            )}

            {/* ── STEP: confirm ───────────────────────────────────────── */}
            {step === "confirm" && preview && (
              <div className="space-y-4">
                <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm">
                  {[
                    [t("wd_confirm_from"), indexName],
                    [t("wd_confirm_amount"), fmtUSD(preview.withdrawal_requested)],
                    [t("wd_total_fees"), fmtUSD(preview.total_fees_usd)],
                    [t("wd_you_receive"), fmtUSD(preview.net_usd)],
                    [t("wd_confirm_to"), `${address?.slice(0, 8)}…${address?.slice(-6)}`],
                    [t("wd_confirm_network"), "Base (chainId 8453)"],
                    [t("wd_confirm_token"), "USDC"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/30 leading-relaxed">
                  {t("wd_irreversible")}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep("preview")} className="flex-1 btn-ghost">{t("wd_back_confirm")}</button>
                  <button onClick={() => execute(false)} className="flex-1 btn-primary">
                    {t("wd_execute")}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: processing ────────────────────────────────────── */}
            {step === "processing" && (
              <div className="py-10 flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-brand-blue animate-spin" />
                <p className="text-white/60 text-sm">{t("wd_processing")}</p>
              </div>
            )}

            {/* ── STEP: simulated ─────────────────────────────────────── */}
            {step === "simulated" && result && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <FlaskConical size={36} className="text-cyan-400" />
                  <p className="text-white font-bold text-lg">{t("wd_simulated")}</p>
                  <p className="text-white/50 text-sm">{t("wd_no_tx")}</p>
                </div>

                {result.checks && Object.keys(result.checks).length > 0 && (
                  <div className="bg-white/3 rounded-xl p-4 space-y-1.5">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{t("wd_system_checks")}</p>
                    {Object.entries(result.checks).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-white/40">{k}</span>
                        <span className={String(v).includes("Erro") || String(v).includes("false") ? "text-red-400" : "text-green-400"}>
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white/3 rounded-xl p-3 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_you_receive")}</span><span className="text-white font-semibold">{fmtUSD(result.net_usd)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_pnl")}</span><span className={result.pnl_usd >= 0 ? "text-green-400" : "text-red-400"}>{fmtUSD(result.pnl_usd)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_mgmt_fee")}</span><span className="text-orange-400">{fmtUSD(result.management_fee)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_perf_fee")}</span><span className="text-orange-400">{fmtUSD(result.performance_fee)}</span></div>
                </div>

                {result.message && (
                  <p className="text-xs text-cyan-400/70 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">{result.message}</p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep("preview")} className="flex-1 btn-ghost">{t("wd_back_confirm")}</button>
                  <button onClick={() => execute(false)} className="flex-1 btn-primary">{t("wd_execute")}</button>
                </div>
              </div>
            )}

            {/* ── STEP: success ───────────────────────────────────────── */}
            {step === "success" && result && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 size={40} className="text-green-400" />
                <div>
                  <p className="text-white font-bold text-lg">{t("wd_success")}</p>
                  <p className="text-white/50 text-sm mt-1">
                    {fmtUSD(result.net_usd)} {t("wd_usdc_sent")}
                  </p>
                </div>
                <div className="bg-white/3 rounded-xl p-3 w-full text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_realized_pnl")}</span><span className={result.pnl_usd >= 0 ? "text-green-400" : "text-red-400"}>{result.pnl_label}: {fmtUSD(result.pnl_usd)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_mgmt_fee")}</span><span className="text-white/60">{fmtUSD(result.management_fee)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">{t("wd_perf_fee")}</span><span className="text-white/60">{fmtUSD(result.performance_fee)}</span></div>
                </div>
                {result.basescan && (
                  <a href={result.basescan} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-blue-300 transition-colors">
                    <ExternalLink size={14} /> {t("wd_view_basescan")}
                  </a>
                )}
                {result.warnings?.length > 0 && (
                  <div className="w-full space-y-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-yellow-400/70">{w}</p>
                    ))}
                  </div>
                )}
                <button onClick={handleClose} className="btn-ghost w-full">{t("wd_cancel")}</button>
              </div>
            )}

            {/* ── STEP: error ─────────────────────────────────────────── */}
            {step === "error" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <AlertCircle size={40} className="text-red-400" />
                <div>
                  <p className="text-white font-bold">{t("wd_failed")}</p>
                  <p className="text-white/40 text-sm mt-1 max-w-sm">{errorMsg}</p>
                </div>
                {errorMsg.includes("ETH") && (
                  <div className="text-xs text-yellow-400/70 bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-3 text-left">
                    {t("wd_eth_required")}
                  </div>
                )}
                <button onClick={() => setStep("input")} className="btn-ghost w-full">{t("wd_try_again")}</button>
              </div>
            )}

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
