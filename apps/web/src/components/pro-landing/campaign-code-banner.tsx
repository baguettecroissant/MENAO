"use client";

import { Check } from "lucide-react";
import { fr } from "@/i18n/fr";
import { usePartnerCode } from "@/lib/partners/use-partner-code";

/** Bandeau « Code appliqué » quand l'artisan arrive par un lien suivi (/p/<code>/pro, ADR 0266). */
export function CampaignCodeBanner() {
  const code = usePartnerCode();
  if (!code) return null;
  return (
    <p className="flex items-center justify-center gap-2 bg-[#7ee2b0] px-4 py-2.5 text-sm font-semibold text-foreground">
      <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      {fr.pro.signUp.account.referralApplied(code)}
    </p>
  );
}
