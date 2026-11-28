import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { CommercialDemoBanner, CommercialDemoGuard } from "@/components/commercial/demo-guard";
import {
  BonusCelebration,
  type Celebration,
} from "@/components/commercial/field/bonus-celebration";
import { HomeScreenDetector } from "@/components/commercial/field/home-screen-detector";
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
  // Prime à célébrer, une fois (ADR 0396).
  const { data: celebration } =
    space.active && !space.demo
      ? await space.supabase.rpc("commercial_next_celebration")
      : { data: null };
  // Démo par lien (ADR 0344) : bandeau orange et actions arrêtées avant d'agir.
  return (
    <AppShell
      space="commercial"
      account={space.account}
      topBanner={space.demo ? <CommercialDemoBanner /> : null}
    >
      {space.demo ? <CommercialDemoGuard>{children}</CommercialDemoGuard> : children}
      {/* Étape « MENAO sur l'écran d'accueil » de « Bien démarrer » (ADR 0394). */}
      {space.active && !space.demo && <HomeScreenDetector done={false} />}
      {celebration && typeof celebration === "object" && "id" in celebration && (
        <BonusCelebration celebration={celebration as unknown as Celebration} />
      )}
    </AppShell>
  );
}
