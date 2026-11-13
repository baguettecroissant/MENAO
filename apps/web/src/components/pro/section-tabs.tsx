"use client";

import { SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.pro.space;

/** Rubriques regroupées du menu (ADR 0188) et leurs onglets (adresse sous l'espace pro). */
const SECTIONS = {
  // « Argent » : grand titre et phrase d'introduction au-dessus des onglets (ADR 0247).
  // Bouton « Mes paiements » dans l'en-tête (F-146, lot 40) : réglage de l'échéancier par défaut.
  argent: {
    label: t.money,
    tabs: t.moneyTabs,
    intro: t.moneyIntro,
    width: "max-w-5xl",
    action: t.moneyAction,
  },
  // « Ma vitrine » : même en-tête (ADR 0250).
  vitrine: {
    label: t.storefront,
    tabs: t.storefrontTabs,
    intro: t.storefrontIntro,
    width: "max-w-6xl",
    action: null,
  },
} as const;

/**
 * Onglets en haut des pages d'une rubrique regroupée : « Argent » (devis, factures, dépenses) et
 * « Ma vitrine » (fiche, avis, grade). Affichés sur les listes seulement, pas sur une fiche ou un
 * formulaire (`/pro/depenses/…`). `base` : espace pro, ou ses exemples (ADR 0184).
 */
export function SectionTabs({
  section,
  base = "/pro",
  hidden = [],
}: {
  section: keyof typeof SECTIONS;
  base?: string;
  /** Onglets absents de la formule (« Suivi » hors Premium et Entreprise, ADR 0237). */
  hidden?: readonly string[];
}) {
  const pathname = usePathname();
  const { label, tabs, intro, width, action } = SECTIONS[section];
  const entries = (Object.entries(tabs) as [string, string][]).filter(
    ([slug]) => !hidden.includes(slug),
  );
  // Le bouton d'action est réservé à l'espace réel (pas aux exemples, ADR 0184).
  const actionHref = action && base === "/pro" ? `${base}/${action.slug}` : null;
  const onAction = actionHref !== null && pathname === actionHref;
  if (!onAction && !entries.some(([slug]) => pathname === `${base}/${slug}`)) return null;
  return (
    <div className={`mx-auto flex w-full flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8 ${width}`}>
      {intro && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{label}</h1>
            <p className="text-base text-label">{intro}</p>
          </div>
          {action && actionHref && (
            <Link
              href={actionHref as Route}
              aria-current={onAction ? "page" : undefined}
              className="inline-flex min-h-[2.625rem] items-center gap-2 rounded-pill bg-foreground px-4 text-[0.9375rem] font-semibold text-surface hover:bg-foreground/90 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {action.label}
            </Link>
          )}
        </div>
      )}
      <nav
        aria-label={label}
        className="flex w-max max-w-full gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1 shadow-card"
      >
        {entries.map(([slug, name]) => (
          <Link
            key={slug}
            href={`${base}/${slug}` as Route}
            aria-current={pathname === `${base}/${slug}` ? "page" : undefined}
            className="flex min-h-10 items-center rounded-pill px-4 text-[0.9375rem] font-medium whitespace-nowrap text-foreground hover:bg-background aria-[current=page]:bg-foreground aria-[current=page]:font-semibold aria-[current=page]:text-surface"
          >
            {name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
