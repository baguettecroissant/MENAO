import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { focusRing } from "@/components/ui";

/**
 * Inscription artisan (ADR 0110) : page sans menu ni pied de page du site, pour aller au bout
 * sans distraction.
 */
export default function ArtisanSignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
          <Link href="/pro" aria-label="MENAO" className={`rounded-sm ${focusRing}`}>
            <Logo />
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
