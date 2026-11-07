import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";
import { requireTeamPermission } from "@/lib/artisan/space";

/**
 * Rubrique « Ma vitrine » du menu regroupé (ADR 0188) : onglets en haut des listes. Réservée au
 * patron (ADR 0241).
 */
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  await requireTeamPermission("storefront");
  return (
    <>
      <SectionTabs section="vitrine" />
      {children}
    </>
  );
}
