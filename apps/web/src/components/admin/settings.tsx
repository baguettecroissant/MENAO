import { Clock3, Rocket, SlidersHorizontal, Store, Target, UsersRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { SettingsChange, SettingsSection } from "@/lib/admin/settings";
import { SETTINGS_SECTIONS } from "@/lib/admin/settings";
import { formatDay } from "@/lib/format";

const t = fr.admin.settingsPage;
const euroFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Montant en centimes d'un réglage, pour un résumé (« 110 € ») ; vide : « — ». */
export const settingEuros = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "—" : euroFormat.format(cents / 100);

const ICONS: Record<SettingsSection, typeof Clock3> = {
  plateforme: SlidersHorizontal,
  demandes: Target,
  accueil: Clock3,
  partenaires: UsersRound,
  commerciaux: Store,
  lancement: Rocket,
};

/** Sous-menu de la page Réglages : un lien par section (ancres), collé en haut sur ordinateur. */
export function SettingsNav() {
  return (
    <nav
      aria-label={t.onThisPage}
      className="flex flex-col gap-0.5 rounded-card border border-border bg-surface p-2.5 shadow-card lg:sticky lg:top-6"
    >
      <span className="px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {t.onThisPage}
      </span>
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = ICONS[section];
        return (
          <a
            key={section}
            href={`#${section}`}
            className="flex min-h-10 items-center gap-2.5 rounded-input px-3 text-[0.9375rem] font-medium hover:bg-background"
          >
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {t.menu[section]}
          </a>
        );
      })}
    </nav>
  );
}

/** Ligne « Modifié le … par … » d'une section, lue dans le journal d'audit. */
export function SettingsChangeLine({ change }: { change: SettingsChange }) {
  const label = !change
    ? t.never
    : change.by
      ? t.changed(formatDay(change.at), change.by)
      : t.changedNoName(formatDay(change.at));
  return (
    <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
      <Clock3 aria-hidden="true" className="size-3.5" />
      {label}
    </p>
  );
}

/** Section de la page Réglages : titre, phrase, réglage, dernière modification. */
export function SettingsCard({
  id,
  title,
  lead,
  change,
  children,
}: {
  id: SettingsSection;
  title: string;
  lead?: string;
  change: SettingsChange;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="flex scroll-mt-24 flex-col gap-4">
      <CardTitle title={title} description={lead} />
      {children}
      <SettingsChangeLine change={change} />
    </Card>
  );
}

/**
 * Réglage rangé dans les Réglages (ADR 0284), rappelé sur sa page d'origine : son résumé et le
 * lien pour le modifier.
 */
export function SettingsLink({
  section,
  title,
  summary,
}: {
  section: SettingsSection;
  title: string;
  summary: string;
}) {
  const Icon = ICONS[section];
  return (
    <div className="flex items-start gap-3.5 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-label">{summary}</span>
        <Link
          href={`/admin/reglages#${section}` as Route}
          className="self-start font-semibold text-primary-strong underline-offset-2 hover:underline"
        >
          {t.edit} →
        </Link>
      </div>
    </div>
  );
}
