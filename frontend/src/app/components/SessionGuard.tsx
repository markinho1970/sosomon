"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useLang } from "@/lib/LanguageContext";

const SESSION_KEY   = "sosomon_last_active";
const TIMEOUT_MS    = 30 * 60 * 1000;
const WARNING_MS    = 5  * 60 * 1000;
const POLL_MS       = 30 * 1000;

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const { disconnect }  = useDisconnect();
  const { t } = useLang();
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [warning, setWarning]     = useState(false);
  const [countdown, setCountdown] = useState(0);

  const touch = useCallback(() => {
    localStorage.setItem(SESSION_KEY, String(Date.now()));
    setWarning(false);
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const doDisconnect = useCallback(() => {
    setWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    localStorage.removeItem(SESSION_KEY);
    disconnect();
  }, [disconnect]);

  const startCountdown = useCallback((remainingMs: number) => {
    if (countdownRef.current) return;
    setCountdown(Math.ceil(remainingMs / 1000));
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          doDisconnect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doDisconnect]);

  useEffect(() => {
    if (!isConnected) {
      setWarning(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const last = parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10);
    if (last && Date.now() - last > TIMEOUT_MS) { doDisconnect(); return; }

    touch();

    intervalRef.current = setInterval(() => {
      const ts   = parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10);
      if (!ts) return;
      const idle = Date.now() - ts;
      if (idle >= TIMEOUT_MS) {
        doDisconnect();
      } else if (idle >= TIMEOUT_MS - WARNING_MS && !warning) {
        setWarning(true);
        startCountdown(TIMEOUT_MS - idle);
      }
    }, POLL_MS);

    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach(e => window.removeEventListener(e, touch));
    };
  }, [isConnected, touch, doDisconnect, startCountdown, warning]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <>
      {children}
      {warning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-amber-500/30 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{t("sess_expiring")}</h3>
            <p className="text-white/50 text-sm mb-4">{t("sess_msg")}</p>
            <div className="text-4xl font-mono font-bold text-amber-400 mb-5">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={touch} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all">{t("sess_continue")}</button>
              <button onClick={doDisconnect} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all">{t("sess_disconnect")}</button>
            </div>
            <p className="text-white/25 text-xs mt-3">{t("sess_hint")}</p>
          </div>
        </div>
      )}
    </>
  );
}
