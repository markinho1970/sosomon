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
  minDepositUsd?: number;
  lotNumber?: number;          // Se informado, o modal mostra "Lote #N" e opera no lote
  buttonLabel?: string;        // Label customizado para o botão trigger
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

export default function WithdrawButton({
  indexId, indexName, currentValueUsd, navUsd, depositedUsd = 0,
  minDepositUsd = 25, lotNumber, buttonLabel,
}: Props) {
  const { address } = useAccount();
  const { t } = useLang();
  const { networkMode } = useNetworkMode();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [amount, setAmount] = useState("");
  // withdrawValue armazena o valor real enviado ao backend (separado do input string)
  const [withdrawValue, setWithdrawValue] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const amountNum = parseFloat(amount) || 0;

  // Saque parcial só é viável se o lote/portfólio tem pelo menos 2× o mínimo do índice
  const minPartialUsd = minDepositUsd;
  const maxPartialUsd = currentValueUsd - minDepositUsd;
  const partialViable = maxPartialUsd >= minPartialUsd;

  const isFullWithdrawal = amountNum >= currentValueUsd * 0.9999;
  const isValid = amountNum > 0 && (
    isFullWithdrawal ||
    (partialViable && amountNum >= minPartialUsd && amountNum <= maxPartialUsd)
  );

  let inputError = "";
  if (amountNum > 0 && !isFullWithdrawal) {
    if (!partialViable) {
      inputError = `Saque parcial indisponível — valor abaixo do mínimo necessário. Use "Sacar Tudo" ou aguarde crescer para ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minDepositUsd * 2)}.`;
    } else if (amountNum < minPartialUsd) {
      inputError = `Mínimo para saque parcial: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minPartialUsd)} (garante ordens mínimas de $5 por token).`;
    } else if (amountNum > maxPartialUsd) {
      inputError = `Máximo para saque parcial: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(maxPartialUsd)} (deve sobrar ao menos ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minDepositUsd)} na cesta). Para sacar mais use "Sacar Tudo".`;
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setStep("input"); setAmount(""); setPreview(null); setResult(null); setWithdrawValue(0); }, 300);
  }

  // Aceita valor opcional — quando chamado direto (ex: "Sacar Tudo"), ignora o input
  async function loadPreview(valueOverride?: number) {
    const v = valueOverride !== undefined ? valueOverride : amountNum;
    if (!address || v <= 0) return;
    setWithdrawValue(v);
    setLoadingPreview(true);
    try {
      const { data } = await api.post("/api/invest/withdraw-preview", {
        wallet_address: address,
        index_id: indexId,
        amount_usd: v,
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
        amount_usd: withdrawValue,
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
  const modalTitle = lotNumber !== undefined
    ? `${indexName} — Lote #${lotNumber}`
    : t("wd_title", { index: indexName });

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost w-full text-sm">
        {buttonLabel || t("wd_btn")}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-brand-gray border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-white">
                {modalTitle}
              </Dialog.Title>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* ── STEP: input ─────────────────────────────────────────── */}
            {step === "input" && (
              <div className="space-y-4">
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

                {/* Quando saque parcial não é viável, mostra apenas o botão direto */}
                {!partialViable ? (
                  <>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/8 border border-orange-500/20">
                      <AlertTriangle size={13} className="text-orange-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-300/80">
                        Saque parcial indisponível. O valor mínimo para manter a cesta ativa é {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minDepositUsd)} — não há margem para retirada parcial. Você pode sacar o valor total ou aguardar crescer.
                      </p>
                    </div>

                    <button
                      onClick={() => loadPreview(currentValueUsd)}
                      disabled={loadingPreview}
                      className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingPreview
                        ? <><Loader2 size={15} className="animate-spin" /> Calculando...</>
                        : `Sacar Tudo (${fmtUSD(currentValueUsd)})`
                      }
                    </button>
                  </>
                ) : (
                  <>
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
                      {inputError && (
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-400">{inputError}</p>
                        </div>
                      )}
                      {!inputError && amountNum === 0 && (
                        <p className="text-xs text-white/30 mt-1">
                          Parcial: entre {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minPartialUsd)} e {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(maxPartialUsd)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            const v = currentValueUsd * pct / 100;
                            const clamped = pct === 100 ? currentValueUsd : Math.min(Math.max(v, minPartialUsd), maxPartialUsd);
                            setAmount(clamped.toFixed(2));
                          }}
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
                      onClick={() => loadPreview()}
                      disabled={!isValid || loadingPreview}
                      className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingPreview
                        ? <><Loader2 size={15} className="animate-spin" /> Calculando...</>
                        : "Pré-visualizar saque"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── STEP: preview ───────────────────────────────────────── */}
            {step === "preview" && preview && (
              <div className="space-y-4">
                <div className="bg-white/3 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Valor solicitado</span>
                    <span className="text-white font-semibold">{fmtUSD(preview.withdrawal_requested)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Custo de aquisição</span>
                    <span className="text-white">{fmtUSD(preview.cost_basis_proportional)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">P&L</span>
                    <span className={preview.pnl_usd >= 0 ? "text-green-400" : "text-red-400"}>
                      {fmtUSD(preview.pnl_usd)} ({preview.pnl_pct.toFixed(2)}%)
                    </span>
                  </div>
                  <hr className="border-white/8" />
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Taxa de gestão (0,75%/ano)</span>
                    <span className="text-white/70">{fmtUSD(preview.management_fee_usd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Taxa de performance (15%)</span>
                    <span className="text-white/70">{fmtUSD(preview.performance_fee_usd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Gas estimado (rede Base)</span>
                    <span className="text-white/70">{fmtUSD(preview.gas_fee_est_usd)}</span>
                  </div>
                  <hr className="border-white/8" />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-white">Você receberá</span>
                    <span className="text-green-400 text-base">{fmtUSD(preview.net_usd)}</span>
                  </div>
                </div>

                {preview.warnings?.length > 0 && (
                  <div className="space-y-1.5">
                    {preview.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                        <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300/80">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {networkMode === "testnet" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <FlaskConical size={13} className="text-purple-400 shrink-0" />
                    <p className="text-xs text-purple-300/80">Modo testnet — simulação sem transação real</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep("input")} className="flex-1 btn-ghost text-sm">
                    ← Voltar
                  </button>
                  <button onClick={() => setStep("confirm")} className="flex-1 btn-primary text-sm">
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: confirm ───────────────────────────────────────── */}
            {step === "confirm" && preview && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-white/60 text-sm">Confirmar saque de</p>
                  <p className="text-2xl font-bold text-white mt-2">{fmtUSD(preview.net_usd)}</p>
                  <p className="text-xs text-white/30 mt-1">após taxas · USDC na sua carteira</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => execute(true)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/8 text-white/60 hover:text-white border border-white/8 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FlaskConical size={14} />
                    Simular
                  </button>
                  <button
                    onClick={() => execute(false)}
                    className="flex-1 btn-primary text-sm"
                  >
                    Executar saque →
                  </button>
                </div>
                <button onClick={() => setStep("input")} className="w-full btn-ghost text-xs text-white/30">
                  Cancelar
                </button>
              </div>
            )}

            {/* ── STEP: processing ────────────────────────────────────── */}
            {step === "processing" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 size={36} className="animate-spin text-brand-blue" />
                <p className="text-white/60 text-sm">Enviando transação… não feche esta janela</p>
              </div>
            )}

            {/* ── STEP: success ───────────────────────────────────────── */}
            {step === "success" && result && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 size={40} className="text-green-400" />
                  <p className="text-white font-semibold">Saque enviado!</p>
                  <p className="text-2xl font-bold text-green-400">{fmtUSD(result.net_usd)}</p>
                </div>

                {result.tx_hash && (
                  <a
                    href={result.basescan}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 text-xs text-brand-blue/70 hover:text-brand-blue transition-colors"
                  >
                    <ExternalLink size={12} />
                    Ver transação no Basescan
                  </a>
                )}

                <button onClick={handleClose} className="btn-primary w-full">
                  Fechar
                </button>
              </div>
            )}

            {/* ── STEP: simulated ─────────────────────────────────────── */}
            {step === "simulated" && result && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <FlaskConical size={40} className="text-purple-400" />
                  <p className="text-white font-semibold">Simulação concluída</p>
                  <p className="text-2xl font-bold text-white">{fmtUSD(result.net_usd)}</p>
                </div>

                {result.checks && (
                  <div className="bg-white/3 rounded-xl p-3 space-y-1">
                    {Object.entries(result.checks).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-white/40">{k}</span>
                        <span className="text-white/70">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={handleClose} className="btn-primary w-full">
                  Fechar
                </button>
              </div>
            )}

            {/* ── STEP: error ─────────────────────────────────────────── */}
            {step === "error" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertCircle size={40} className="text-red-400" />
                  <p className="text-white font-semibold">Erro no saque</p>
                  <p className="text-xs text-white/50 text-center">{errorMsg}</p>
                </div>

                <button onClick={() => setStep("input")} className="btn-primary w-full">
                  {t("wd_try_again")}
                </button>
              </div>
            )}

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
