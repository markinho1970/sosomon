"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";

interface WalletSession {
  lockedAddress: string | null;
  pendingAddress: string | null;
  stayWithLocked: () => void;
  switchToNew: () => void;
  sessionDisconnect: () => void;
}

const WalletSessionContext = createContext<WalletSession>({
  lockedAddress: null,
  pendingAddress: null,
  stayWithLocked: () => {},
  switchToNew: () => {},
  sessionDisconnect: () => {},
});

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const lockedRef = useRef<string | null>(null);
  const [lockedAddress, setLockedAddress] = useState<string | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      lockedRef.current = null;
      setLockedAddress(null);
      setPendingAddress(null);
      return;
    }

    const normalized = address.toLowerCase();

    if (lockedRef.current === null) {
      // First connect: lock this address
      lockedRef.current = normalized;
      setLockedAddress(normalized);
      setPendingAddress(null);
    } else if (normalized !== lockedRef.current) {
      // Wallet extension switched account: notify user
      setPendingAddress(normalized);
    }
  }, [address, isConnected]);

  const stayWithLocked = useCallback(() => {
    setPendingAddress(null);
  }, []);

  const switchToNew = useCallback(() => {
    setPendingAddress(prev => {
      if (prev) {
        lockedRef.current = prev;
        setLockedAddress(prev);
      }
      return null;
    });
  }, []);

  const sessionDisconnect = useCallback(() => {
    lockedRef.current = null;
    setLockedAddress(null);
    setPendingAddress(null);
    disconnect();
  }, [disconnect]);

  return (
    <WalletSessionContext.Provider value={{ lockedAddress, pendingAddress, stayWithLocked, switchToNew, sessionDisconnect }}>
      {children}
    </WalletSessionContext.Provider>
  );
}

export const useWalletSession = () => useContext(WalletSessionContext);
