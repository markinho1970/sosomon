"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { useLang } from "@/lib/LanguageContext";

export default function NetworkGuard() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { isTestnet } = useNetworkMode();
  const { t } = useLang();

  const expectedChainId = isTestnet ? baseSepolia.id : base.id;
  const expectedName    = isTestnet ? "Base Sepolia" : "Base";

  if (chainId === expectedChainId) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-300">{t("net_wrong")}</p>
          <p className="text-xs text-amber-400/70">{t("net_msg", { net: expectedName })}</p>
        </div>
      </div>
      <button
        onClick={() => switchChain({ chainId: expectedChainId })}
        disabled={isPending}
        className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-all disabled:opacity-50"
      >
        <ArrowRightLeft size={13} />
        {isPending ? t("net_switching") : t("net_btn", { net: expectedName })}
      </button>
    </div>
  );
}
