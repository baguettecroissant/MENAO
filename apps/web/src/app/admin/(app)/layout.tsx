import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: fr.admin.title,
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <p className="text-lg font-bold">{fr.admin.title}</p>
        <nav className="flex items-center gap-4">
          <Link href="/admin/artisans" className="font-medium text-primary">
            {fr.admin.nav.artisans}
          </Link>
          <Link href="/admin/surveillance" className="font-medium text-primary">
            {fr.admin.nav.watch}
          </Link>
          <Link href="/admin/tickets" className="font-medium text-primary">
            {fr.admin.nav.tickets}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-touch font-medium underline-offset-2 hover:underline"
            >
              {fr.admin.nav.signOut}
            </button>
          </form>
        </nav>
      </div>
      {children}
    </div>
  );
}
