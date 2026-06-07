import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { base, baseSepolia, mainnet } from "wagmi/chains";

// Ambas as chains sempre disponíveis — o contexto NetworkModeContext controla qual usar
export const wagmiConfig = getDefaultConfig({
  appName: "SoSoMon",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  wallets: [
    {
      groupName: "Browser Extension",
      wallets: [metaMaskWallet, injectedWallet],
    },
  ],
  chains: [base, baseSepolia, mainnet],
  ssr: true,
});
