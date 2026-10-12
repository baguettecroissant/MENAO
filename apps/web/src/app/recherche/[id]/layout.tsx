import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { SiteHeader } from "@/components/site/header";
import { getShellAccount } from "@/lib/client/shell";

/**
 * Étapes d'une recherche (critères, artisans, fiche, envoi) : dans l'espace client pour un compte
 * particulier connecté, sans en sortir (ADR 0042) ; sinon en-tête du site, comme la saisie
 * (visiteur, session anonyme de recherche). Pages propres à un projet : jamais mises en cache.
 */
export default async function ProjectSearchLayout({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
  if (shell?.account.role === "particulier") {
    return (
      <AppShell
        space="client"
        account={shell.account}
        badges={{ actions: shell.actions, messages: shell.unreadMessages }}
      >
        {children}
      </AppShell>
    );
  }
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
