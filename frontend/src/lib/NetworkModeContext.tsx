"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useChainId, useAccount, useSwitchChain } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const STORAGE_KEY = "sosomon_network_mode";

interface NetworkModeContextType {
  isTestnet: boolean;
  networkMode: "mainnet" | "testnet";
  toggleMode: () => void;
}

const NetworkModeContext = createContext<NetworkModeContextType>({
  isTestnet: false,
  networkMode: "mainnet",
  toggleMode: () => {},
});

export function NetworkModeProvider({ children }: { children: React.ReactNode }) {
  const [isTestnet, setIsTestnet] = useState(false);
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  // Ref para evitar stale closure no efeito de conexão
  const isTestnetRef = useRef(false);
  const wasConnected = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "testnet") {
      setIsTestnet(true);
      isTestnetRef.current = true;
    }
  }, []);

  // Mantém ref sincronizada com o estado
  useEffect(() => {
    isTestnetRef.current = isTestnet;
  }, [isTestnet]);

  // Quando conecta pela primeira vez, força a chain correta conforme o modo escolhido
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      const targetChain = isTestnetRef.current ? baseSepolia.id : base.id;
      if (chainId !== targetChain) {
        switchChain({ chainId: targetChain });
      }
    }
    wasConnected.current = isConnected;
  }, [isConnected, chainId, switchChain]);

  useEffect(() => {
    // CSS data-attribute usado pelo globals.css para ajustar padding das páginas
    document.documentElement.setAttribute("data-testnet", String(isTestnet));
  }, [isTestnet]);

  const toggleMode = useCallback(() => {
    setIsTestnet((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "testnet" : "mainnet");
      return next;
    });
  }, []);

  return (
    <NetworkModeContext.Provider value={{ isTestnet, networkMode: isTestnet ? "testnet" : "mainnet", toggleMode }}>
      {children}
    </NetworkModeContext.Provider>
  );
}

export function useNetworkMode() {
  return useContext(NetworkModeContext);
}
