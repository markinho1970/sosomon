"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { useState } from "react";
import SessionGuard from "./components/SessionGuard";
import { NetworkModeProvider } from "@/lib/NetworkModeContext";
import { LanguageProvider } from "@/lib/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#f97316",
            accentColorForeground: "black",
            borderRadius: "large",
            fontStack: "system",
          })}
        >
          <LanguageProvider>
            <NetworkModeProvider>
              <SessionGuard>{children}</SessionGuard>
            </NetworkModeProvider>
          </LanguageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
