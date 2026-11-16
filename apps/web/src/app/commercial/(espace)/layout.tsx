import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { CommercialDemoBanner, CommercialDemoGuard } from "@/components/commercial/demo-guard";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";

// Ajout à l'écran d'accueil (ADR 0211) : icône MENAO qui ouvre l'espace en plein écran.
export const metadata: Metadata = {
  manifest: "/commercial.webmanifest",
  appleWebApp: { capable: true, title: fr.meta.name, statusBarStyle: "default" },
};

/** Espace commercial (F-65, ADR 0205) : code et inscrits, guide terrain, dans la coque. */
export default async function CommercialSpaceLayout({ children }: { children: ReactNode }) {
  const space = await getCommercialSpace();
  // Démo par lien (ADR 0344) : bandeau orange et actions arrêtées avant d'agir.
  return (
    <AppShell
      space="commercial"
      account={space.account}
      topBanner={space.demo ? <CommercialDemoBanner /> : null}
    >
      {space.demo ? <CommercialDemoGuard>{children}</CommercialDemoGuard> : children}
    </AppShell>
  );
}
