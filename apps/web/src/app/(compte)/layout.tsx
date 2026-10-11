import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getProShell } from "@/lib/artisan/space";
import { getShellAccount } from "@/lib/client/shell";

/**
 * Pages communes au client et à l'artisan (centre de notifications, suivi d'un signalement) :
 * coque de l'application selon le rôle (ADR 0034, 0035).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
  const role = shell?.account.role;
  if (role === "artisan") {
    const pro = await getProShell();
    return (
      <AppShell space="pro" account={pro.account} badges={pro.badges} visibility={pro.visibility}>
        {children}
      </AppShell>
    );
  }
  if (role === "artisan_en_attente") {
    return (
      <AppShell space="pro" account={shell?.account ?? null}>
        {children}
      </AppShell>
    );
  }
  return (
    <AppShell
      space="client"
      account={shell?.account ?? null}
      badges={{ actions: shell?.actions ?? 0, messages: shell?.unreadMessages ?? 0 }}
    >
      {children}
    </AppShell>
  );
}
