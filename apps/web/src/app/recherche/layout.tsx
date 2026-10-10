import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/header";

/**
 * Recherche d'artisans (F-05 à F-11), maquettes « Dernière étape avant de découvrir vos
 * artisans » : en-tête du site, sans le pied de page (parcours de demande, ADR 0034).
 */
export default function SearchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
