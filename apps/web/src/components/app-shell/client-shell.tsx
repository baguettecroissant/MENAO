import type { ReactNode } from "react";
import { ClientBottomNav } from "@/components/app-shell/client-bottom-nav";
import { ClientHeader } from "@/components/app-shell/client-header";
import { getShellAccount } from "@/lib/client/shell";

/** Coque de l'application client (ADR 0034) : en-tête, contenu, onglets mobiles ; pas de pied de page du site. */
export async function ClientShell({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ClientHeader account={shell?.account ?? null} unreadMessages={shell?.unreadMessages ?? 0} />
      <div className="flex flex-1 flex-col">{children}</div>
      <ClientBottomNav />
    </div>
  );
}
