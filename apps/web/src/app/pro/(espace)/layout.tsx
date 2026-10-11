import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getProShell } from "@/lib/artisan/space";

/**
 * Espace pro (F-16 à F-18, ADR 0035) : menu latéral avec les compteurs (demandes à traiter,
 * devis attendus, messages) et l'état de visibilité ; barre d'onglets sur mobile.
 */
export default async function ProSpaceLayout({ children }: { children: ReactNode }) {
  const { account, badges, visibility } = await getProShell();
  return (
    <AppShell space="pro" account={account} badges={badges} visibility={visibility}>
      {children}
    </AppShell>
  );
}
