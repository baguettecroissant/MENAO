import type { ReactNode } from "react";
import { ClientShell } from "@/components/app-shell/client-shell";
import { ProHeader } from "@/components/pro/pro-header";
import { ProBottomNav } from "@/components/pro/pro-nav";
import { getShellAccount } from "@/lib/client/shell";

/**
 * Pages communes au client et à l'artisan (centre de notifications, suivi d'un signalement) :
 * coque de l'application selon le rôle (ADR 0034).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
  const role = shell?.account.role;
  if (role === "artisan" || role === "artisan_en_attente") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <ProHeader
          firstName={shell?.account.firstName ?? null}
          avatarUrl={shell?.account.avatarUrl ?? null}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <ProBottomNav />
      </div>
    );
  }
  return <ClientShell>{children}</ClientShell>;
}
