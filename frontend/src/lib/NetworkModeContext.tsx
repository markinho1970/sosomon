"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useChainId, useAccount, useSwitchChain } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const STORAGE_KEY = "sosomon_network_mode";

interface NetworkModeContextType {
  isTestnet: boolean;
  networkMode: "mainnet" | "testnet";
  toggleMode: () => void;
  resetToMainnet: () => void;
}

const NetworkModeContext = createContext<NetworkModeContextType>({
  isTestnet: false,
  networkMode: "mainnet",
  toggleMode: () => {},
  resetToMainnet: () => {},
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

  // Quando conecta: força a chain correta. Quando desconecta: reseta para mainnet.
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      const targetChain = isTestnetRef.current ? baseSepolia.id : base.id;
      if (chainId !== targetChain) {
        switchChain({ chainId: targetChain });
      }
    } else if (!isConnected && wasConnected.current) {
      setIsTestnet(false);
      isTestnetRef.current = false;
      localStorage.removeItem(STORAGE_KEY);
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

  const resetToMainnet = useCallback(() => {
    setIsTestnet(false);
    isTestnetRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <NetworkModeContext.Provider value={{ isTestnet, networkMode: isTestnet ? "testnet" : "mainnet", toggleMode, resetToMainnet }}>
      {children}
    </NetworkModeContext.Provider>
  );
}

export function useNetworkMode() {
  return useContext(NetworkModeContext);
}
