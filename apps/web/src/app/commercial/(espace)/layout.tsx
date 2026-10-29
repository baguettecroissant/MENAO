import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getCommercialSpace } from "@/lib/commercial/space";

/** Espace commercial (F-65, ADR 0205) : code et inscrits, guide terrain, dans la coque. */
export default async function CommercialSpaceLayout({ children }: { children: ReactNode }) {
  const space = await getCommercialSpace();
  return (
    <AppShell space="commercial" account={space.account}>
      {children}
    </AppShell>
  );
}
