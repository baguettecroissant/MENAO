"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.pro.space;

/** Rubriques regroupées du menu (ADR 0188) et leurs onglets (adresse sous l'espace pro). */
const SECTIONS = {
  argent: { label: t.money, tabs: t.moneyTabs },
  vitrine: { label: t.storefront, tabs: t.storefrontTabs },
} as const;

/**
 * Onglets en haut des pages d'une rubrique regroupée : « Argent » (devis, factures, dépenses) et
 * « Ma vitrine » (fiche, avis, grade). Affichés sur les listes seulement, pas sur une fiche ou un
 * formulaire (`/pro/depenses/…`). `base` : espace pro, ou ses exemples (ADR 0184).
 */
export function SectionTabs({
  section,
  base = "/pro",
}: {
  section: keyof typeof SECTIONS;
  base?: string;
}) {
  const pathname = usePathname();
  const { label, tabs } = SECTIONS[section];
  const entries = Object.entries(tabs) as [string, string][];
  if (!entries.some(([slug]) => pathname === `${base}/${slug}`)) return null;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <nav
        aria-label={label}
        className="flex w-max max-w-full gap-1 overflow-x-auto rounded-pill bg-surface p-1 shadow-card"
      >
        {entries.map(([slug, name]) => (
          <Link
            key={slug}
            href={`${base}/${slug}` as Route}
            aria-current={pathname === `${base}/${slug}` ? "page" : undefined}
            className="flex min-h-10 items-center rounded-pill px-4 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
          >
            {name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
