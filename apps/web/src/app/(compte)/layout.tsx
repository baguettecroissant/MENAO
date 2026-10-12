import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireStaff } from "@/lib/admin/guard";
import { getAdminShell } from "@/lib/admin/shell";
import { getProShell } from "@/lib/artisan/space";
import { getShellAccount } from "@/lib/client/shell";

/**
 * Pages communes au client et à l'artisan (centre de notifications, suivi d'un signalement) :
 * coque de l'application selon le rôle (ADR 0034, 0035).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const shell = await getShellAccount();
  const role = shell?.account.role;
  // Équipe MENAO (ADR 0050) : ses notifications dans la coque du back-office, après la double
  // authentification.
  if (role === "admin" || role === "support") {
    const staff = await requireStaff();
    const admin = await getAdminShell(staff.supabase, staff.userId, staff.role);
    return (
      <AppShell space="admin" account={admin.account} badges={admin.badges}>
        {children}
      </AppShell>
    );
  }
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
