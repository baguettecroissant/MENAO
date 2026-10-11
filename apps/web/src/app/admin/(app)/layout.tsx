import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminShell } from "@/lib/admin/shell";

export const metadata: Metadata = {
  title: fr.admin.title,
  robots: { index: false, follow: false },
};

/** Pages de travail du back-office (ADR 0035) : menu latéral avec les dossiers et tickets à traiter. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase, userId } = await requireAdmin();
  const { account, badges } = await getAdminShell(supabase, userId);
  return (
    <AppShell space="admin" account={account} badges={badges}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </AppShell>
  );
}
