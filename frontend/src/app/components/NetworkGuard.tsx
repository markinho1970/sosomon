"use client";

import { useState, useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { AlertTriangle, ArrowRightLeft, Plus, Coins } from "lucide-react";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { useLang } from "@/lib/LanguageContext";

const CHAINS = {
  testnet: {
    name: "Base Sepolia",
    chainId: 84532,
    chainIdHex: "0x14a34",
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcSymbol: "USDC",
    usdcName: "USD Coin (Testnet)",
  },
  mainnet: {
    name: "Base",
    chainId: 8453,
    chainIdHex: "0x2105",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcSymbol: "USDC",
    usdcName: "USD Coin",
  },
};

export default function NetworkGuard() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { isTestnet } = useNetworkMode();
  const { t } = useLang();
  const [status, setStatus] = useState<"idle" | "error" | "added">("idle");
  const [tokenAdded, setTokenAdded] = useState(false);
  const [mounted, setMounted] = useState(false);

  const mode = isTestnet ? "testnet" : "mainnet";
  const net = CHAINS[mode];
  const expectedChainId = isTestnet ? baseSepolia.id : base.id;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (chainId === expectedChainId) setStatus("idle"); }, [chainId, expectedChainId]);

  if (!mounted || chainId === expectedChainId) return null;

  async function handleSwitch() {
    setStatus("idle");
    switchChain(
      { chainId: expectedChainId },
      { onError: () => setStatus("error") }
    );
  }

  async function handleAddNetwork() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: net.chainIdHex,
          chainName: net.name,
          nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
          rpcUrls: [net.rpc],
          blockExplorerUrls: [net.explorer],
        }],
      });
      setStatus("added");
    } catch {
      setStatus("error");
    }
  }

  async function handleAddUSDC() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: net.usdc,
            symbol: net.usdcSymbol,
            decimals: 6,
            name: net.usdcName,
          },
        },
      });
      setTokenAdded(true);
    } catch {}
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-3">
      {/* Linha principal */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">{t("net_wrong")}</p>
            <p className="text-xs text-amber-400/70">{t("net_msg", { net: net.name })}</p>
          </div>
        </div>
        <button
          onClick={handleSwitch}
          disabled={isPending}
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-all disabled:opacity-50"
        >
          <ArrowRightLeft size={13} />
          {isPending ? t("net_switching") : t("net_btn", { net: net.name })}
        </button>
      </div>

      {/* Falhou: oferecer adicionar rede + tokens */}
      {status === "error" && (
        <div className="pl-6 space-y-2">
          <p className="text-xs text-amber-400/70">
            Switch failed — approve the MetaMask popup, or add the network manually:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAddNetwork}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all"
            >
              <Plus size={12} />
              Add {net.name} to MetaMask
            </button>
            <button
              onClick={handleAddUSDC}
              disabled={tokenAdded}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all disabled:opacity-50"
            >
              <Coins size={12} />
              {tokenAdded ? "USDC added ✓" : "Add USDC Token"}
            </button>
          </div>
        </div>
      )}

      {/* Rede adicionada com sucesso */}
      {status === "added" && (
        <div className="pl-6 flex items-center gap-2">
          <p className="text-xs text-green-400">
            {net.name} added! Now click Switch above, then add USDC:
          </p>
          <button
            onClick={handleAddUSDC}
            disabled={tokenAdded}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium disabled:opacity-50"
          >
            <Coins size={12} />
            {tokenAdded ? "USDC added ✓" : "Add USDC"}
          </button>
        </div>
      )}
    </div>
  );
}
