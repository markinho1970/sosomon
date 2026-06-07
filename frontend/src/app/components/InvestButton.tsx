"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X, Copy, CheckCircle2, ExternalLink, Info, Clock,
  Loader2, AlertTriangle, Shield, ShieldCheck,
} from "lucide-react";
import api, { investApi } from "@/lib/api";
import { useNetworkMode } from "@/lib/NetworkModeContext";
import { useLang } from "@/lib/LanguageContext";
import { base, baseSepolia } from "wagmi/chains";
import { FlaskConical } from "lucide-react";

interface Props {
  indexId: string;
  indexName: string;
  navUsd: number;
}

const TERMS_VERSION = "v1.0";

const RISK_KEYS = [
  { id: "volatility",   labelKey: "risk_volatility_label",   textKey: "risk_volatility_text" },
  { id: "no_guarantee", labelKey: "risk_no_guarantee_label", textKey: "risk_no_guarantee_text" },
  { id: "no_insurance", labelKey: "risk_no_insurance_label", textKey: "risk_no_insurance_text" },
  { id: "custody",      labelKey: "risk_custody_label",      textKey: "risk_custody_text" },
  { id: "regulatory",   labelKey: "risk_regulatory_label",   textKey: "risk_regulatory_text" },
  { id: "network",      labelKey: "risk_network_label",      textKey: "risk_network_text" },
  { id: "no_legal",     labelKey: "risk_no_legal_label",     textKey: "risk_no_legal_text" },
  { id: "ai_risk",      labelKey: "risk_ai_label",           textKey: "risk_ai_text" },
];

type Step = "disclaimer" | "signing" | "wallet" | "sent";

export default function InvestButton({ indexId, indexName, navUsd }: Props) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { isTestnet, networkMode } = useNetworkMode();
  const { t } = useLang();
  const ACTIVE_CHAIN_ID = isTestnet ? baseSepolia.id : base.id;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("disclaimer");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [fundWallet, setFundWallet] = useState<string | null>(null);
  const [fundBalance, setFundBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [loadingWallet, setLoadingWallet] = useState(false);

  const allChecked = checked.size === RISK_KEYS.length;

  useEffect(() => {
    if (step !== "wallet") return;
    setLoadingWallet(true);
    investApi.getFundWallet(networkMode)
      .then((info) => {
        setFundWallet(info.address);
        setFundBalance(info.usdc_balance);
      })
      .catch(() => setFundWallet(null))
      .finally(() => setLoadingWallet(false));
  }, [step]);

  function handleOpenClick() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    setStep("disclaimer");
    setChecked(new Set());
    setSignError("");
    setOpen(true);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSign() {
    if (!address || !allChecked) return;
    setSigning(true);
    setSignError("");

    const now = new Date().toISOString();
    const message = [
      "SoSoMon — Risk Disclosure Term",
      `Version: ${TERMS_VERSION}`,
      `Date: ${now}`,
      `Wallet: ${address}`,
      `Index: ${indexName} (${indexId})`,
      "",
      "By signing, I confirm I have read and agree to all listed risks:",
      "- Extreme volatility risk and total loss",
      "- No return guarantee or deposit insurance",
      "- Custody risk and technical failure",
      "- Regulatory, network and AI strategy risk",
      "- Operation outside the traditional regulated financial system",
      "",
      "I invest on my own account and fully accept the risks.",
    ].join("\n");

    try {
      setStep("signing");
      const signature = await signMessageAsync({ message });

      await api.post("/api/invest/register-consent", {
        wallet_address: address,
        index_id: indexId,
        signature,
        signed_message: message,
        network_mode: networkMode,
      });

      setStep("wallet");
    } catch (err: any) {
      setSignError(err?.message?.includes("rejected") ? t("invest_error_rejected") : t("invest_error_generic"));
      setStep("disclaimer");
    } finally {
      setSigning(false);
    }
  }

  function handleCopy() {
    if (!fundWallet) return;
    navigator.clipboard.writeText(fundWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrUrl = fundWallet
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${fundWallet}&bgcolor=0D1117&color=ffffff&margin=10`
    : null;

  return (
    <>
      <button onClick={handleOpenClick} className="btn-primary w-full">
        {isConnected ? t("invest_btn") : t("invest_connect")}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-brand-gray border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-brand-gray border-b border-white/8 flex items-center justify-between px-6 py-4 z-10">
              <Dialog.Title className="text-base font-bold text-white flex items-center gap-2">
                {step === "disclaimer" || step === "signing" ? (
                  <><AlertTriangle size={16} className="text-amber-400" /> {t("invest_title", { index: indexName })}</>
                ) : step === "wallet" ? (
                  <><ShieldCheck size={16} className="text-green-400" /> {t("invest_signed")}</>
                ) : (
                  <><Clock size={16} className="text-amber-400" /> {t("invest_waiting")}</>
                )}
              </Dialog.Title>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">

              {/* ── Step 1: Disclaimer ── */}
              {(step === "disclaimer" || step === "signing") && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-300 text-sm font-semibold mb-1 flex items-center gap-2">
                      <Shield size={14} /> {t("invest_read_warning")}
                    </p>
                    <p className="text-amber-200/70 text-xs leading-relaxed">
                      {t("invest_warning_text")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {RISK_KEYS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          checked.has(item.id)
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-white/8 bg-white/2 hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            checked.has(item.id) ? "bg-green-500 border-green-500" : "border-white/30"
                          }`}>
                            {checked.has(item.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${checked.has(item.id) ? "text-green-300" : "text-white/80"}`}>
                              {t(item.labelKey)}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{t(item.textKey)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className={`rounded-xl p-3 text-center text-sm transition-all ${
                    allChecked ? "bg-green-500/10 border border-green-500/20" : "bg-white/3 border border-white/8"
                  }`}>
                    {allChecked
                      ? <span className="text-green-300 font-medium">✓ {t("invest_allcheck")}</span>
                      : <span className="text-white/30">{t("invest_items_confirmed", { n: checked.size, total: RISK_KEYS.length })}</span>
                    }
                  </div>

                  {signError && (
                    <p className="text-red-400 text-sm text-center">{signError}</p>
                  )}

                  <button
                    onClick={handleSign}
                    disabled={!allChecked || signing}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      allChecked && !signing
                        ? "bg-brand-blue hover:bg-blue-500 text-white"
                        : "bg-white/5 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {signing ? (
                      <><Loader2 size={16} className="animate-spin" /> {t("invest_signing")}</>
                    ) : (
                      <><Shield size={16} /> {t("invest_sign")}</>
                    )}
                  </button>

                  <p className="text-center text-xs text-white/20">
                    {t("invest_sign_note")}
                  </p>
                </div>
              )}

              {/* ── Step 2: Wallet + QR ── */}
              {step === "wallet" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <ShieldCheck size={16} className="text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-300 text-sm font-medium">{t("invest_term_signed_title")}</p>
                      <p className="text-green-400/60 text-xs">{t("invest_term_signed_desc")}</p>
                    </div>
                  </div>

                  {/* Mínimo — sempre visível, bem destacado */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <div>
                      <p className="text-red-300 text-sm font-bold">{t("invest_minimum_title")}</p>
                      <p className="text-red-400/70 text-xs">{t("invest_minimum_desc")}</p>
                    </div>
                  </div>

                  {isTestnet && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <FlaskConical size={14} className="text-orange-400 shrink-0" />
                      <span className="text-orange-300 text-sm font-medium">{t("invest_testnet_warn")}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-300 text-sm font-medium">
                      {isTestnet ? "Base Sepolia (Testnet)" : "Base Network"} · Chain ID {ACTIVE_CHAIN_ID}
                    </span>
                    <span className="ml-auto text-xs text-blue-400/60">USDC only</span>
                  </div>

                  <div className="bg-white/3 rounded-xl p-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("invest_your_wallet")}</p>
                    <p className="font-mono text-white/80 text-sm break-all">{address}</p>
                    <p className="text-xs text-white/30 mt-1">{t("invest_wallet_note")}</p>
                  </div>

                  <div className="bg-white/3 rounded-xl p-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">{t("invest_send_to")}</p>
                    {loadingWallet ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-white/40" />
                      </div>
                    ) : fundWallet ? (
                      <div className="flex gap-4 items-start">
                        {qrUrl && (
                          <img src={qrUrl} alt="Fund wallet QR" width={90} height={90}
                            className="rounded-lg shrink-0 border border-white/10" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-white text-xs break-all leading-relaxed">{fundWallet}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <button onClick={handleCopy}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
                              {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                              {copied ? t("invest_copied") : t("invest_copy")}
                            </button>
                            <a
                              href={`${isTestnet ? "https://sepolia.basescan.org" : "https://basescan.org"}/address/${fundWallet}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
                              <ExternalLink size={12} /> {isTestnet ? "Sepolia Basescan" : "Basescan"}
                            </a>
                          </div>
                          {fundBalance !== null && (
                            <p className="text-xs text-white/30 mt-1.5">
                              {t("invest_fund_balance")} <span className="text-white/50">${fundBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-400 text-sm">{t("invest_wallet_error")}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/2 border border-white/5">
                    <Info size={12} className="text-white/30 shrink-0" />
                    <span className="text-xs text-white/30">
                      {t("invest_usdc_contract")} {isTestnet ? "(Sepolia):" : "(Base):"}
                    </span>
                    <span className="font-mono text-xs text-white/50 break-all">
                      {isTestnet
                        ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
                        : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">{t("invest_how_works")}</p>
                    {[
                      isTestnet ? t("invest_step1_testnet") : t("invest_step1_mainnet"),
                      t("invest_step2"),
                      t("invest_step3", { nav: navUsd.toFixed(4) }),
                      t("invest_min"),
                    ].map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/50">
                        <span className="text-brand-blue font-bold shrink-0">{i + 1}.</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/3 rounded-lg p-2.5">
                      <p className="text-white/30">{t("invest_mgmt_fee_label")}</p>
                      <p className="text-white font-medium">{t("invest_mgmt_fee_val")}</p>
                    </div>
                    <div className="bg-white/3 rounded-lg p-2.5">
                      <p className="text-white/30">{t("invest_perf_fee_label")}</p>
                      <p className="text-white font-medium">{t("invest_perf_fee_val")}</p>
                    </div>
                  </div>

                  <button onClick={() => setStep("sent")} className="btn-primary w-full">
                    {t("invest_sent")}
                  </button>
                </div>
              )}

              {/* ── Step 3: Pending ── */}
              {step === "sent" && (
                <div className="py-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Clock size={28} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{t("invest_pending_title")}</p>
                    <p className="text-white/50 text-sm mt-1 max-w-xs mx-auto">
                      {t("invest_pending")}
                    </p>
                  </div>
                  <div className="bg-white/3 rounded-xl p-4 text-left text-sm w-full space-y-1.5">
                    {[
                      [t("invest_summary_index"), indexName],
                      [t("invest_summary_network"), "Base Network"],
                      [t("invest_summary_wallet"), `${address?.slice(0, 8)}…${address?.slice(-6)}`],
                      [t("invest_summary_nav"), `$${navUsd.toFixed(4)}`],
                      [t("invest_summary_term"), `${TERMS_VERSION} ✓`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-white/40">{label}</span>
                        <span className={`font-mono text-xs ${label === t("invest_summary_term") ? "text-green-400" : "text-white/80"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/dashboard" className="btn-primary w-full text-center">{t("invest_view_dashboard")}</a>
                  <button onClick={() => setOpen(false)} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                    {t("invest_close")}
                  </button>
                </div>
              )}

            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
