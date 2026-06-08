"use client";
import { useLang } from "@/lib/LanguageContext";

export default function DisclaimerFooter() {
  const { t } = useLang();
  return (
    <footer className="border-t border-brand-orange/10 py-4 px-4 text-center space-y-1">
      <p className="text-[13px] text-brand-orange/30 leading-relaxed max-w-3xl mx-auto">
        {t("disclaimer")}
      </p>
      <p className="text-[13px] text-brand-orange/25">
        {t("intellectual_credit")}
      </p>
    </footer>
  );
}
