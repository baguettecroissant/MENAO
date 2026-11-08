"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.pro.space;

/** Rubriques regroupées du menu (ADR 0188) et leurs onglets (adresse sous l'espace pro). */
const SECTIONS = {
  // « Argent » : grand titre et phrase d'introduction au-dessus des onglets (ADR 0247).
  argent: { label: t.money, tabs: t.moneyTabs, intro: t.moneyIntro, width: "max-w-5xl" },
  // « Ma vitrine » : même en-tête (ADR 0250).
  vitrine: {
    label: t.storefront,
    tabs: t.storefrontTabs,
    intro: t.storefrontIntro,
    width: "max-w-6xl",
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
  const { label, tabs, intro, width } = SECTIONS[section];
  const entries = (Object.entries(tabs) as [string, string][]).filter(
    ([slug]) => !hidden.includes(slug),
  );
  if (!entries.some(([slug]) => pathname === `${base}/${slug}`)) return null;
  return (
    <div className={`mx-auto flex w-full flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-8 ${width}`}>
      {intro && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{label}</h1>
          <p className="text-base text-label">{intro}</p>
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
