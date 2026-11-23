import type { ReactNode } from "react";
import { SiteAnalytics } from "@/components/site/analytics";
import { appTheme } from "@/lib/fonts";

/** Pages de campagne de l'Espace Pro (ADR 0266) : sans menu ni pied de page du site. */
export default function CampaignLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${appTheme} flex min-h-dvh flex-col bg-background`}>
      {children}
      <SiteAnalytics />
    </div>
  );
}
