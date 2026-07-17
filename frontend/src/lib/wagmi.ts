import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, baseSepolia, mainnet } from "wagmi/chains";

// connectorsForWallets (sem walletConnectWallet) não inicializa o relay WalletConnect
// globalmente — evita a falha de validação de domínio que quebrava isConnected.
// MetaMask é adicionado explicitamente para aparecer mesmo quando OKX sobrescreve window.ethereum.
const connectors = connectorsForWallets(
  [{ groupName: "Browser Extension", wallets: [metaMaskWallet, injectedWallet] }],
  { appName: "SoSoMon", projectId: "unused" },
);

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, mainnet],
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
