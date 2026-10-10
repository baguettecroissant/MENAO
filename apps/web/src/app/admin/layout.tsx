import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";

/**
 * Back-office (ADR 0034) : sa propre coque, sans l'en-tête ni le pied de page du site. Le logo
 * mène à l'accueil du back-office.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/admin" aria-label={fr.admin.title} className="rounded-md">
            <Logo />
          </Link>
          <span className="rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
            {fr.admin.badge}
          </span>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
