import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

const t = fr.admin.launch.tabs;

/** Pages du lancement, dans l'ordre des onglets (F-66, lot 2, ADR 0209). */
const TABS = [
  { key: "planning", href: "/admin/lancement", label: t.planning },
  { key: "chiffres", href: "/admin/lancement/chiffres", label: t.figures },
  { key: "codes", href: "/admin/lancement/codes", label: t.codes },
] as const;
export type LaunchTab = (typeof TABS)[number]["key"];

/**
 * Onglets en pilule en tête des pages Lancement : planning, chiffres, codes de suivi. Le menu du
 * back-office garde une seule entrée « Lancement ». Onglet courant passé par la page (pas lu dans
 * l'adresse : rendu serveur, sans script).
 */
export function LaunchTabs({ current }: { current: LaunchTab }) {
  return (
    <nav
      aria-label={t.label}
      className="flex w-max max-w-full gap-1 overflow-x-auto rounded-pill bg-surface p-1 shadow-card"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href as Route}
          aria-current={tab.key === current ? "page" : undefined}
          className="flex min-h-10 items-center rounded-pill px-4 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * En-tête commun des pages Lancement : titre « Lancement », phrase de la page, élément à droite
 * facultatif (« Mon planning », état du direct), puis les onglets.
 */
export function LaunchHeader({
  current,
  intro,
  aside,
}: {
  current: LaunchTab;
  intro: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{fr.admin.launch.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{intro}</p>
        </div>
        {aside}
      </div>
      <LaunchTabs current={current} />
    </div>
  );
}
