"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { investApi } from "@/lib/api";

interface Props {
  indexId: string;
  indexName: string;
  navUsd: number;
}

type Step = "input" | "confirm" | "loading" | "success" | "error";

export default function InvestButton({ indexId, indexName, navUsd }: Props) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [amount, setAmount] = useState("100");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ tokens_received: number; amount_usd: number } | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const tokensEstimate = navUsd > 0 ? amountNum / navUsd : 0;
  const isValidAmount = amountNum >= 50;

  function handleOpenClick() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    setStep("input");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => setStep("input"), 300);
  }

  async function handleInvest() {
    if (!address || !isValidAmount) return;
    setStep("loading");
    try {
      const res = await investApi.invest(address, indexId, amountNum);
      setResult({ tokens_received: res.tokens_received, amount_usd: res.amount_usd });
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Investment failed");
      setStep("error");
    }
  }

  return (
    <>
      <button onClick={handleOpenClick} className="btn-primary w-full">
        {isConnected ? "Invest Now" : "Connect Wallet to Invest"}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-brand-gray border border-white/10 rounded-2xl p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-white">
                Invest in {indexName}
              </Dialog.Title>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Step: input */}
            {step === "input" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      min="50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-blue/60"
                      placeholder="100"
                    />
                  </div>
                  {!isValidAmount && amountNum > 0 && (
                    <p className="text-xs text-red-400 mt-1">Minimum investment is $50</p>
                  )}
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {[100, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                    >
                      ${v >= 1000 ? `${v / 1000}k` : v}
                    </button>
                  ))}
                </div>

                {/* Estimate */}
                <div className="bg-white/3 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-white/40">
                    <span>You receive (est.)</span>
                    <span className="text-white font-medium">{tokensEstimate.toFixed(4)} tokens</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>NAV per token</span>
                    <span className="text-white">${navUsd.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Management fee</span>
                    <span className="text-white">0.75% /yr</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Performance fee</span>
                    <span className="text-white">15% on profits</span>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={!isValidAmount}
                    className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                  <p className="text-center text-xs text-white/20">
                    Wallet: {address?.slice(0, 6)}…{address?.slice(-4)}
                  </p>
                </div>
              </div>
            )}

            {/* Step: confirm */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Index</span>
                    <span className="text-white font-medium">{indexName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Amount</span>
                    <span className="text-white font-medium">${amountNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Tokens received</span>
                    <span className="text-white font-medium">{tokensEstimate.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Wallet</span>
                    <span className="font-mono text-white/60 text-xs">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
                  </div>
                </div>
                <p className="text-xs text-white/30 leading-relaxed">
                  By confirming, your position will be registered on SoSoValue ValueChain. Subject to 0.75%/yr management fee and 15% performance fee on profits above high-water mark.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep("input")} className="flex-1 btn-ghost">Back</button>
                  <button onClick={handleInvest} className="flex-1 btn-primary">Confirm Investment</button>
                </div>
              </div>
            )}

            {/* Step: loading */}
            {step === "loading" && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-brand-blue animate-spin" />
                <p className="text-white/60 text-sm">Processing your investment…</p>
              </div>
            )}

            {/* Step: success */}
            {step === "success" && result && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 size={40} className="text-green-400" />
                <div>
                  <p className="text-white font-bold text-lg">Investment Confirmed!</p>
                  <p className="text-white/50 text-sm mt-1">
                    ${result.amount_usd.toLocaleString()} invested · {result.tokens_received.toFixed(4)} tokens received
                  </p>
                </div>
                <a href="/dashboard" className="btn-primary w-full text-center">
                  View Dashboard →
                </a>
              </div>
            )}

            {/* Step: error */}
            {step === "error" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <AlertCircle size={40} className="text-red-400" />
                <div>
                  <p className="text-white font-bold">Investment Failed</p>
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
