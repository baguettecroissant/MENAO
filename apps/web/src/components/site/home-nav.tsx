"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { NAV_LINKS } from "./nav-links";

const t = fr.nav;

/** Navigation intégrée au bandeau de l'accueil : pilule translucide (maquette « Homepage »). */
export function HomeNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav aria-label={t.main} className="relative z-20">
      <div className="flex h-14 items-center justify-between gap-4 rounded-pill border border-white/60 bg-white/80 pr-2 pl-5 shadow-raised backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="MENAO, accueil" className="rounded-md">
            <Logo />
          </Link>
          <ul className="hidden items-center gap-6 text-sm text-foreground/80 lg:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary-strong">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/mon-espace" variant="outline" size="sm">
            {t.myClientSpace}
          </ButtonLink>
          <ButtonLink href="/recherche" size="sm">
            {t.findArtisanBtp}
            <Search aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-accueil"
          aria-label={open ? t.closeMenu : t.menu}
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-background lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div
          id="menu-accueil"
          className="absolute inset-x-0 top-16 rounded-card border border-border bg-surface p-4 shadow-raised lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-12 items-center border-b border-border text-[0.9375rem]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/mon-espace" variant="outline" block>
              {t.myClientSpace}
            </ButtonLink>
            <ButtonLink href="/recherche" block>
              {t.findArtisanBtp}
              <Search aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
      )}
    </nav>
  );
}
