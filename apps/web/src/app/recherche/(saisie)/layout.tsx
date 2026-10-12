import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/header";

/**
 * Saisie du besoin pour les visiteurs (F-05) : en-tête du site, sans le pied de page (parcours de
 * demande, ADR 0034), page publique pré-générée. Depuis son espace, le client saisit son besoin
 * dans /mon-espace/nouvelle-demande ; les étapes d'un projet ont leur mise en page (ADR 0042).
 */
export default function SearchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
