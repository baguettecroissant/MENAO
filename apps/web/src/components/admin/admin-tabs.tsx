import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

const t = fr.admin.tabs;

/**
 * Rubriques du back-office à plusieurs pages (ADR 0283) : une entrée au menu, des onglets en
 * pilule en tête de page (comme Lancement), les filtres soulignés en dessous.
 */
export const ADMIN_TAB_SETS = {
  overview: {
    label: fr.admin.nav.overview,
    tabs: [
      { key: "summary", href: "/admin", label: t.overview.summary },
      { key: "activity", href: "/admin/activite", label: t.overview.activity },
    ],
  },
  compliance: {
    label: t.compliance.title,
    tabs: [
      { key: "renewals", href: "/admin/conformite", label: t.compliance.renewals },
      { key: "expiring", href: "/admin/conformite/echeances", label: t.compliance.expiring },
      { key: "spotChecks", href: "/admin/conformite/controles", label: t.compliance.spotChecks },
    ],
  },
  contributors: {
    label: t.contributors.title,
    tabs: [
      { key: "commercials", href: "/admin/commerciaux", label: t.contributors.commercials },
      { key: "partners", href: "/admin/partenaires", label: t.contributors.partners },
      { key: "referrals", href: "/admin/parrainages", label: t.contributors.referrals },
    ],
  },
  subscriptions: {
    label: fr.admin.nav.subscriptions,
    tabs: [
      { key: "subscriptions", href: "/admin/abonnements", label: t.subscriptions.subscriptions },
      { key: "topUps", href: "/admin/abonnements/recharges", label: t.subscriptions.topUps },
    ],
  },
  settings: {
    label: fr.admin.settingsPage.title,
    tabs: [
      { key: "settings", href: "/admin/reglages", label: fr.admin.settingsPage.tabs.settings },
      { key: "team", href: "/admin/reglages/equipe", label: fr.admin.settingsPage.tabs.team },
    ],
  },
  technical: {
    label: t.technical.title,
    tabs: [
      { key: "ai", href: "/admin/technique", label: t.technical.ai },
      { key: "webhooks", href: "/admin/technique/notifications", label: t.technical.webhooks },
    ],
  },
} as const;
export type AdminTabSet = keyof typeof ADMIN_TAB_SETS;

/**
 * Onglets en pilule (ADR 0283) : rubriques du menu et fiches (fiche artisan, ADR 0285). Onglet
 * courant passé par la page ; `count` affiche un compteur à côté du libellé.
 */
export function PillTabs({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: readonly { key: string; href: string; label: string; count?: number }[];
  current: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex w-max max-w-full gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1 shadow-card [scrollbar-width:none]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href as Route}
          aria-current={tab.key === current ? "page" : undefined}
          className="group flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 aria-[current=page]:bg-foreground aria-[current=page]:font-semibold aria-[current=page]:text-white"
        >
          {tab.label}
          {tab.count ? (
            <span className="rounded-pill bg-background px-1.5 text-xs font-semibold text-label tabular-nums group-aria-[current=page]:bg-white/20 group-aria-[current=page]:text-white">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Onglets en pilule d'une rubrique. Onglet courant passé par la page (rendu serveur, sans
 * script) ; `counts` affiche un compteur à côté du libellé (éléments à traiter).
 */
export function AdminTabs<S extends AdminTabSet>({
  set,
  current,
  counts = {},
}: {
  set: S;
  current: (typeof ADMIN_TAB_SETS)[S]["tabs"][number]["key"];
  counts?: Partial<Record<string, number>>;
}) {
  const { label, tabs } = ADMIN_TAB_SETS[set];
  return (
    <PillTabs
      label={label}
      current={current}
      tabs={tabs.map((tab) => ({ ...tab, count: counts[tab.key] }))}
    />
  );
}

/**
 * En-tête d'une page de rubrique à onglets : titre de la rubrique (le nom du menu), phrase de la
 * rubrique, élément à droite facultatif, chiffres facultatifs, onglets, puis la phrase propre à
 * l'onglet.
 */
export function AdminSectionHeader<S extends AdminTabSet>({
  set,
  current,
  counts,
  title,
  intro,
  aside,
  figures,
  lead,
}: {
  set: S;
  current: (typeof ADMIN_TAB_SETS)[S]["tabs"][number]["key"];
  counts?: Partial<Record<string, number>>;
  title?: string;
  intro?: string;
  aside?: ReactNode;
  figures?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {title ?? ADMIN_TAB_SETS[set].label}
          </h1>
          {intro && <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{intro}</p>}
        </div>
        {aside}
      </div>
      {figures}
      <AdminTabs set={set} current={current} counts={counts} />
      {lead && <div className="max-w-3xl text-[0.9375rem] text-label">{lead}</div>}
    </div>
  );
}
