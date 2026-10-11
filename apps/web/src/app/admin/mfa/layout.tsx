import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";

/** Double authentification du back-office : en-tête simple, avant l'accès aux pages de travail. */
export default function AdminMfaLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
    </>
  );
}
