"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "testnet") setIsTestnet(true);
  }, []);

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
