import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { appTheme } from "@/lib/fonts";

/**
 * Inscription artisan (ADR 0110) : page sans menu ni pied de page du site, pour aller au bout
 * sans distraction.
 */
export default function ArtisanSignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${appTheme} flex min-h-dvh flex-col bg-background`}>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/pro" aria-label="MENAO" className={`rounded-sm ${focusRing}`}>
            <Logo />
          </Link>
          <span className="rounded-chip bg-primary-soft px-2 py-1 text-xs font-semibold text-primary-strong">
            {fr.nav.pro}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
