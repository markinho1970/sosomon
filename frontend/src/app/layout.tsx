import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import TestnetBanner from "./components/TestnetBanner";
import DisclaimerFooter from "./components/DisclaimerFooter";

export const metadata: Metadata = {
  title: "SoSoMon — AI-Managed Thematic Crypto Indexes",
  description:
    "Thematic crypto indexes managed by AI agents, verified on-chain. Built on SoSoValue ValueChain.",
  keywords: ["crypto", "index fund", "AI", "DePIN", "RWA", "SoSoValue", "on-chain", "SoSoMon"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    apple: [
      { url: "/favicon.ico", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "SoSoMon",
    description: "Your AI portfolio manager. It never sleeps. It never panics.",
    url: "https://sosomon.xyz",
    siteName: "SoSoMon",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SoSoMon",
    description: "Thematic indexes. Managed by AI. Verified on-chain.",
    creator: "@SoSoMon",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-brand-dark text-brand-white antialiased">
        <TestnetBanner />
        <Providers>
          {children}
          <DisclaimerFooter />
        </Providers>
      </body>
    </html>
  );
}
