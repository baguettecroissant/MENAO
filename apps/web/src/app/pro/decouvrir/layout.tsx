import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { ExamplesBanner } from "@/components/pro/examples";
import { requireExampleViewer } from "@/lib/artisan/examples";

/**
 * Espace pro rempli d'exemples (ADR 0184) : ouvert à tout compte artisan, pendant la vérification
 * du dossier comme après la validation, et aux commerciaux pour leurs démos (ADR 0205). Données
 * fictives, rien n'est lu ni écrit en base.
 */
export default async function ExamplesLayout({ children }: { children: ReactNode }) {
  const { account, validated, commercial } = await requireExampleViewer();
  return (
    <AppShell
      space="exemples"
      account={account}
      badges={{ requests: 2, quotes: 1, messages: 1, reviews: 1 }}
      topBanner={<ExamplesBanner validated={validated} commercial={commercial} />}
    >
      {children}
    </AppShell>
  );
}
