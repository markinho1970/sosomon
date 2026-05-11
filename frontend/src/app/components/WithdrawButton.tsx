"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { investApi } from "@/lib/api";

interface Props {
  indexId: string;
  indexName: string;
  currentValueUsd: number;
  navUsd: number;
}

type Step = "input" | "confirm" | "loading" | "success" | "error";

export default function WithdrawButton({ indexId, indexName, currentValueUsd, navUsd }: Props) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ net_usd: number; performance_fee_usd: number } | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= 5 && amountNum <= currentValueUsd;
  const tokensEstimate = navUsd > 0 ? amountNum / navUsd : 0;

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setStep("input"); setAmount(""); }, 300);
  }

  async function handleWithdraw() {
    if (!address || !isValid) return;
    setStep("loading");
    try {
      const res = await investApi.withdraw(address, indexId, amountNum);
      setResult({ net_usd: res.net_usd, performance_fee_usd: res.performance_fee_usd });
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Withdrawal failed");
      setStep("error");
    }
  }

  if (currentValueUsd <= 0) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost w-full text-sm">
        Withdraw
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-brand-gray border border-white/10 rounded-2xl p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-white">
                Withdraw from {indexName}
              </Dialog.Title>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {step === "input" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/40 uppercase tracking-wider">Amount (USD)</label>
                    <span className="text-xs text-white/30">
                      Available: <span className="text-white/60">${currentValueUsd.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      min="10"
                      max={currentValueUsd}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-blue/60"
                      placeholder="10"
                    />
                  </div>
                  {amountNum > 0 && !isValid && (
                    <p className="text-xs text-red-400 mt-1">
                      {amountNum < 5 ? "Minimum withdrawal is $5" : "Exceeds available balance"}
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

                <div className="bg-white/3 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-white/40">
                    <span>Tokens to redeem</span>
                    <span className="text-white">{tokensEstimate.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Performance fee (15%)</span>
                    <span className="text-white">on profits only</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Settlement</span>
                    <span className="text-white">USDC on Base · ~24h</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep("confirm")}
                  disabled={!isValid}
                  className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Withdraw from</span>
                    <span className="text-white font-medium">{indexName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Amount</span>
                    <span className="text-white font-medium">${amountNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">To wallet</span>
                    <span className="font-mono text-white/60 text-xs">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Network</span>
                    <span className="text-white">Base (USDC)</span>
                  </div>
                </div>
                <p className="text-xs text-white/30 leading-relaxed">
                  Performance fee (15%) applies only on profits above your high-water mark. Settlement within 24h to your wallet on Base.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep("input")} className="flex-1 btn-ghost">Back</button>
                  <button onClick={handleWithdraw} className="flex-1 btn-primary">Confirm Withdrawal</button>
                </div>
              </div>
            )}

            {step === "loading" && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-brand-blue animate-spin" />
                <p className="text-white/60 text-sm">Processing withdrawal…</p>
              </div>
            )}

            {step === "success" && result && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 size={40} className="text-green-400" />
                <div>
                  <p className="text-white font-bold text-lg">Withdrawal Confirmed!</p>
                  <p className="text-white/50 text-sm mt-1">
                    ${result.net_usd.toFixed(2)} USDC will arrive in your wallet within 24h
                  </p>
                  {result.performance_fee_usd > 0 && (
                    <p className="text-white/30 text-xs mt-1">
                      Performance fee: ${result.performance_fee_usd.toFixed(2)}
                    </p>
                  )}
                </div>
                <button onClick={handleClose} className="btn-ghost w-full">Close</button>
              </div>
            )}

            {step === "error" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <AlertCircle size={40} className="text-red-400" />
                <div>
                  <p className="text-white font-bold">Withdrawal Failed</p>
                  <p className="text-white/40 text-sm mt-1">{errorMsg}</p>
                </div>
                <button onClick={() => setStep("input")} className="btn-ghost w-full">Try Again</button>
              </div>
            )}

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
