"use client";

import { Menu, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { NAV_LINKS, isProPath } from "./nav-links";

const t = fr.nav;

/**
 * En-tête du site (ADR 0199) : la pilule en verre dépoli de l'accueil (maquette « Homepage »),
 * sur toutes les pages du site vitrine et de la recherche ; l'application et le back-office ont
 * leurs coques (ADR 0034).
 * - Placée comme dans le bandeau de l'accueil, qui passe dessous (marge négative de `HomeHero`) :
 *   76 px de haut (20 + 56), 96 px dès `sm` (40 + 56).
 * - Collée en haut au défilement : le haut de l'en-tête sort de l'écran (`top` négatif) et la
 *   pilule s'arrête à 8 px du bord, 64 px de haut en tout, comme l'ancienne barre (barres
 *   collées en `top-16` des pages).
 * - Seule la pilule capte les clics : les marges transparentes laissent passer vers la page.
 * - Liens et boutons dans la pilule dès 1 280 px (`xl`) ; en dessous, menu replié (la pilule est
 *   plus étroite que l'ancienne barre : à 1 024 px, les liens passaient sur deux lignes).
 * - Composition (F-182, ADR 0379) : trois liens courts au centre ; à droite, une seule action
 *   principale, « Décrire mon projet » (bleu), le bouton des artisans en bleu nuit, et l'accès au
 *   compte en lien discret. Le bouton des artisans reste visible sur téléphone (« Espace Pro »).
 */
export function SiteHeader() {
  const pathname = usePathname();
  // Le menu mobile reste ouvert pour la page où il a été ouvert : il se referme en naviguant.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const onPro = isProPath(pathname);

  return (
    <header className="pointer-events-none sticky -top-3 z-30 px-2 pt-5 sm:-top-8 sm:px-4 sm:pt-10">
      <nav
        aria-label={t.main}
        className="pointer-events-auto relative mx-auto max-w-[1440px] px-3 sm:px-6"
      >
        <div className="flex h-14 items-center justify-between gap-4 rounded-pill border border-white/60 bg-white/80 pr-2 pl-5 shadow-raised backdrop-blur-md">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="MENAO, accueil" className="rounded-md">
              <Logo />
            </Link>
            <ul className="hidden items-center gap-6 text-sm text-foreground/80 xl:flex">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="whitespace-nowrap hover:text-primary-strong aria-[current=page]:font-semibold aria-[current=page]:text-primary-strong"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="ml-auto flex items-center gap-1 xl:hidden">
            <NotificationBell />
            {/* Sur téléphone et tablette : le bouton des artisans reste dans la barre. */}
            <ButtonLink
              href="/pro"
              variant="dark"
              size="sm"
              aria-current={onPro ? "page" : undefined}
              className="max-[359px]:hidden"
            >
              <span className="sm:hidden">{t.pro}</span>
              <span className="hidden sm:inline">{t.proCta}</span>
            </ButtonLink>
          </div>
          <div className="hidden items-center gap-2 xl:flex">
            <NotificationBell />
            <ButtonLink
              href="/pro"
              variant="dark"
              size="sm"
              aria-current={onPro ? "page" : undefined}
            >
              {t.proCta}
            </ButtonLink>
            <ButtonLink href="/mon-espace" variant="ghost" size="sm" className="text-foreground">
              <UserRound aria-hidden="true" className="size-4" />
              {t.myClientSpace}
            </ButtonLink>
            <ButtonLink href="/recherche" size="sm">
              {t.describeProject}
              <Search aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
          <button
            type="button"
            onClick={() => setOpenFor(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? t.closeMenu : t.menu}
            className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-background xl:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <div
            id="menu-mobile"
            className="absolute inset-x-3 top-16 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-card border border-border bg-surface p-4 shadow-raised sm:inset-x-6 xl:hidden"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="flex min-h-12 items-center border-b border-border text-[0.9375rem] aria-[current=page]:text-primary-strong"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonLink href="/recherche" block>
                {t.describeProject}
                <Search aria-hidden="true" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/mon-espace" variant="outline" block>
                <UserRound aria-hidden="true" className="size-4" />
                {t.myClientSpace}
              </ButtonLink>
            </div>
            {/* Les artisans, à part des particuliers. */}
            <div className="mt-4 border-t border-border pt-4">
              <ButtonLink
                href="/pro"
                variant="dark"
                block
                aria-current={onPro ? "page" : undefined}
              >
                {t.proCta}
              </ButtonLink>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
