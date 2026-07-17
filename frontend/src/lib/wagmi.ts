import { createConfig, http } from "wagmi";
import { metaMask, injected } from "wagmi/connectors";
import { base, baseSepolia, mainnet } from "wagmi/chains";

// Usa somente conectores injetados (MetaMask/browser extension) sem WalletConnect.
// WalletConnect v2 valida origens contra projectId registrado — falha silenciosamente
// em domínios customizados quando o projectId é inválido, quebrando isConnected no wagmi.
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, mainnet],
  connectors: [metaMask(), injected()],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
