"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between py-2">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="SoSoMon" width={320} height={80} priority className="h-12 w-auto" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/indexes" className="text-sm text-white/60 hover:text-white transition-colors">Indexes</Link>
          <a href="/#how-it-works" onClick={(e) => { e.preventDefault(); window.location.assign(window.location.origin + '/#how-it-works'); }} className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">How it Works</a>
          <a href="/#pricing" onClick={(e) => { e.preventDefault(); window.location.assign(window.location.origin + '/#pricing'); }} className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">Pricing</a>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-all">
            Dashboard
          </Link>
          <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-brand-border bg-black px-4 py-4 flex flex-col gap-4">
          <Link href="/indexes" className="text-sm text-white/60 hover:text-white" onClick={() => setOpen(false)}>Indexes</Link>
          <a href="/#how-it-works" className="text-sm text-white/60 hover:text-white" onClick={() => setOpen(false)}>How it Works</a>
          <a href="/#pricing" className="text-sm text-white/60 hover:text-white" onClick={() => setOpen(false)}>Pricing</a>
          <Link href="/dashboard" className="text-sm text-center text-white/60 border border-white/10 rounded-lg px-4 py-2" onClick={() => setOpen(false)}>Dashboard</Link>
          <div className="flex justify-center">
            <ConnectButton accountStatus="full" chainStatus="none" showBalance={false} />
          </div>
        </div>
      )}
    </nav>
  );
}
