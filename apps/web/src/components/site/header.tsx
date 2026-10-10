"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { NAV_LINKS } from "./nav-links";

const t = fr.nav;
// L'espace pro (tableau de bord, demandes, chantiers) a son propre en-tête.
const PRO_SPACE = [
  "/pro/tableau-de-bord",
  "/pro/demandes",
  "/pro/chantiers",
  "/pro/devis",
  "/pro/factures",
  "/pro/messages",
];

/**
 * En-tête du site (maquettes) : logo, liens, « Mon espace client » et « Trouver un artisan du
 * BTP ». Masqué sur l'accueil, dont le bandeau intègre sa propre navigation, et dans l'espace pro.
 */
export function SiteHeader() {
  const pathname = usePathname();
  // Le menu mobile reste ouvert pour la page où il a été ouvert : il se referme en naviguant.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  if (pathname === "/" || PRO_SPACE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
      <nav
        aria-label={t.main}
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="MENAO, accueil" className="rounded-md">
            <Logo />
          </Link>
          <ul className="hidden items-center gap-6 text-sm text-foreground/80 lg:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className="hover:text-primary-strong aria-[current=page]:text-primary-strong"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="ml-auto flex items-center lg:hidden">
          <NotificationBell />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <NotificationBell />
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
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? t.closeMenu : t.menu}
          className="inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {open && (
        <div
          id="menu-mobile"
          className="border-t border-border bg-surface px-4 pt-2 pb-5 lg:hidden"
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
    </header>
  );
}
