"use client";

import { useState, useEffect } from "react";
import { Droplets, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { useNetworkMode } from "@/lib/NetworkModeContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CIRCLE_FAUCET = "https://faucet.circle.com/";

interface FaucetPanelProps {
  walletAddress: string;
}

export default function FaucetPanel({ walletAddress }: FaucetPanelProps) {
  const { isTestnet } = useNetworkMode();
  const [claimed, setClaimed] = useState(false);
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [claimCount, setClaimCount] = useState(0);

  useEffect(() => {
    if (!walletAddress || !isTestnet) return;
    setChecking(true);
    fetch(`${API}/api/faucet/status/${walletAddress}`)
      .then(r => r.json())
      .then(d => {
        setClaimCount(d.count ?? 0);
        if (d.claimed) { setClaimed(true); setClaimTx(d.basescan ?? null); }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [walletAddress, isTestnet]);

  if (!isTestnet) return null;

  async function handleClaim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/faucet/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setClaimed(true); setError(null); return; }
        throw new Error(data.detail ?? "Faucet error");
      }
      const newCount = claimCount + 1;
      setClaimCount(newCount);
      if (newCount >= 3) setClaimed(true);
      setClaimTx(data.basescan ?? null);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <Droplets size={14} className="text-sky-400 shrink-0" />
        <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">Testnet Resources</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-white/3 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white">Get Test ETH</p>
            <p className="text-xs text-white/40">0.0001 ETH &middot; {claimCount}/3 claimed</p>
          </div>
          {checking ? (
            <Loader2 size={14} className="text-white/30 animate-spin shrink-0" />
          ) : claimed ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <CheckCircle size={14} className="text-green-400" />
              {claimTx && (
                <a href={claimTx} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 underline">
                  tx
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-xs font-semibold transition-all flex items-center gap-1"
            >
              {loading && <Loader2 size={11} className="animate-spin" />}
              Claim
            </button>
          )}
        </div>

        <a
          href={CIRCLE_FAUCET}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/3 hover:bg-white/5 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-all group"
        >
          <div>
            <p className="text-xs font-medium text-white">Get Test USDC</p>
            <p className="text-xs text-white/40">$20 USDC &middot; Circle Faucet</p>
          </div>
          <ExternalLink size={13} className="text-white/30 group-hover:text-sky-400 shrink-0 transition-colors" />
        </a>
      </div>

      {error && <p className="text-xs text-red-400 pl-1">{error}</p>}
    </div>
  );
}