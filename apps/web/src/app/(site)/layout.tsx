import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/**
 * Site vitrine (ADR 0034) : accueil, pages métiers et villes, pages légales, connexion et
 * inscription, présentation de l'Espace Pro. En-tête et pied de page du site ; l'application
 * (client, artisan) et le back-office ont leurs propres coques.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
