import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getShellAccount } from "@/lib/client/shell";

/** Application client (ADR 0034, 0035) : chantiers, devis, messages, documents, avec le menu latéral. */
export default async function ClientSpaceLayout({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
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
