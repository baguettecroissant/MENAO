import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
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
  return (
    <AppShell space="commercial" account={space.account}>
      {children}
    </AppShell>
  );
}
