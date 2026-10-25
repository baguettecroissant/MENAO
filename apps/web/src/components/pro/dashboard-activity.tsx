import { revenueTicks, type DashboardActivity } from "@menao/core";
import { CalendarX2, ChevronRight, FilePen, Share2, UserPlus, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";

const t = fr.pro.dashboard.activity;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euro = (cents: number) => euros.format(cents / 100);
const roundEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
/** Montant arrondi à l'euro des tuiles (le détail au centime est dans les listes). */
const euroRound = (cents: number) => roundEuros.format(Math.round(cents / 100));
const compact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthLong = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });
const monthName = (format: Intl.DateTimeFormat, index: number) =>
  format.format(new Date(Date.UTC(2026, index, 15)));

const card = "flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card";
const rowLink =
  "flex items-center gap-3 rounded-input px-2 py-2.5 -mx-2 transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";

/** Ligne de liste : lien vers le chantier, ou ligne simple quand il n'a pas de page (exemples). */
function Row({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <Link href={href as Route} className={rowLink}>
      {children}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
    </Link>
  ) : (
    <div className="-mx-2 flex items-center gap-3 px-2 py-2.5">{children}</div>
  );
}

/** Page d'un chantier, ou null s'il n'en a pas (historique des exemples). */
export type ChantierHref = (chantierId: string) => string | null;

export type DashboardShortcutLinks = {
  quote: string;
  block: string;
  share: string;
  invite: string;
};

/** Raccourcis du tableau de bord (ADR 0185) : les gestes les plus courants, en un geste. */
export function DashboardShortcuts({ links }: { links: DashboardShortcutLinks }) {
  const items: { key: keyof DashboardShortcutLinks; icon: LucideIcon }[] = [
    { key: "quote", icon: FilePen },
    { key: "block", icon: CalendarX2 },
    { key: "share", icon: Share2 },
    { key: "invite", icon: UserPlus },
  ];
  return (
    <nav aria-label={t.shortcuts.title} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ key, icon: Icon }) => (
        <Link
          key={key}
          href={links[key] as Route}
          className="flex min-h-touch items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm font-medium shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <Icon aria-hidden="true" className="size-[18px]" />
          </span>
          {t.shortcuts[key]}
        </Link>
      ))}
    </nav>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-input bg-background px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Chiffre d'affaires de l'année (ADR 0185) : encaissé, à venir et à recevoir, puis un graphique en
 * colonnes mois par mois (une seule série, sans légende ; valeur au survol ou au clavier, la plus
 * haute écrite au-dessus de sa colonne) et le tableau des mêmes valeurs pour les lecteurs d'écran.
 */
export function RevenueCard({
  activity,
  years,
  yearHref,
  currentMonth,
}: {
  activity: DashboardActivity;
  years: number[];
  yearHref: (year: number) => string;
  /** Mois en cours (0 à 11) si l'année affichée est l'année en cours : les suivants sont à venir. */
  currentMonth: number | null;
}) {
  const ticks = revenueTicks(activity.months);
  const top = ticks.at(-1) ?? 0;
  const max = Math.max(...activity.months);
  const peak = activity.months.indexOf(max);
  const height = (cents: number) => (top > 0 ? (cents / top) * 100 : 0);
  return (
    <section aria-labelledby="chiffre-affaires" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chiffre-affaires" className="text-[1.0625rem] font-medium">
          {t.revenue.title}
        </h2>
        {years.length > 1 && (
          <nav aria-label={t.revenue.years} className="flex gap-1 rounded-pill bg-background p-1">
            {years.map((year) => (
              <Link
                key={year}
                href={yearHref(year) as Route}
                aria-current={year === activity.year ? "page" : undefined}
                className="rounded-pill px-3 py-1 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:shadow-card"
              >
                {year}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat label={t.revenue.year(activity.year)} value={euroRound(activity.yearCents)} />
        <Stat
          label={t.revenue.upcoming}
          value={euroRound(activity.upcomingCents)}
          hint={t.revenue.upcomingHint}
        />
        <Stat
          label={t.revenue.toCollect}
          value={euroRound(activity.toCollectCents)}
          hint={t.revenue.toCollectHint}
        />
      </div>

      {activity.yearCents === 0 ? (
        <p className="rounded-input bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          {t.revenue.empty(activity.year)}
        </p>
      ) : (
        <figure className="flex flex-col gap-2">
          <figcaption className="sr-only">{t.revenue.chart(activity.year)}</figcaption>
          <div aria-hidden="true" className="relative h-48 pl-12">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute right-0 left-12 border-t border-border"
                style={{ bottom: `${height(tick)}%` }}
              >
                <span className="absolute top-0 -left-12 w-10 -translate-y-1/2 text-right text-[0.6875rem] text-muted-foreground">
                  {tick === 0 ? "0" : compact.format(tick / 100)}
                </span>
              </div>
            ))}
            <div className="relative grid h-full grid-cols-12">
              {activity.months.map((cents, i) => {
                const future = currentMonth !== null && i > currentMonth;
                return (
                  <div key={i} className="group relative flex h-full items-end justify-center">
                    {!future && cents > 0 && (
                      <>
                        <div
                          className="w-[min(60%,1.5rem)] rounded-t bg-primary"
                          style={{ height: `${height(cents)}%` }}
                        />
                        <span
                          className={`pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ${
                            i === peak
                              ? "text-foreground"
                              : "hidden bg-foreground text-surface group-hover:block"
                          }`}
                          style={{ bottom: `calc(${height(cents)}% + 4px)` }}
                        >
                          {i === peak
                            ? compact.format(cents / 100)
                            : t.revenue.bar(monthName(monthLong, i), compact.format(cents / 100))}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" className="grid grid-cols-12 pl-12">
            {activity.months.map((_, i) => (
              <span
                key={i}
                className={`text-center text-[0.6875rem] ${
                  i === currentMonth ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {monthName(monthLong, i).charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>{t.revenue.chart(activity.year)}</caption>
            <thead>
              <tr>
                <th scope="col">{t.revenue.month}</th>
                <th scope="col">{t.revenue.amount}</th>
              </tr>
            </thead>
            <tbody>
              {activity.months.map((cents, i) => (
                <tr key={i}>
                  <th scope="row">{monthName(monthLong, i)}</th>
                  <td>{euro(cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
      <p className="text-xs text-muted-foreground">{t.revenue.note}</p>
    </section>
  );
}

function ListCard({
  id,
  title,
  summary,
  children,
  footer,
}: {
  id: string;
  title: string;
  summary?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={card}>
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-[1.0625rem] font-medium">
          {title}
        </h2>
        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      </div>
      {children}
      {footer}
    </section>
  );
}

/** Devis en attente de réponse, taux de signature et devis signé moyen (ADR 0185). */
export function QuotesCard({
  activity,
  base,
  chantierHref,
}: {
  activity: DashboardActivity;
  base: string;
  chantierHref: ChantierHref;
}) {
  const { pending, pendingTotalCents, signRate, averageSignedCents } = activity.quotes;
  return (
    <ListCard
      id="devis-en-attente"
      title={t.quotes.title}
      summary={
        pending.length ? t.quotes.summary(pending.length, euro(pendingTotalCents)) : undefined
      }
      footer={
        <>
          <dl className="grid grid-cols-2 gap-2">
            <Stat
              label={t.quotes.signRate}
              value={signRate === null ? "—" : fr.review.percent(signRate)}
            />
            <Stat
              label={t.quotes.average}
              value={averageSignedCents === null ? "—" : euroRound(averageSignedCents)}
            />
          </dl>
          <TextLink href={`${base}/devis?onglet=envoyes` as Route} className="self-start text-sm">
            {t.quotes.all}
          </TextLink>
        </>
      }
    >
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.quotes.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {pending.slice(0, 3).map((q) => (
            <li key={q.quoteId}>
              <Row href={chantierHref(q.chantierId)}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{q.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[q.clientName, q.sentAt ? t.quotes.sentOn(formatDay(q.sentAt)) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium">{euro(q.totalTtcCents)}</span>
              </Row>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

/** Chantiers en cours : étape et part déjà payée (ADR 0185). */
export function InProgressCard({
  activity,
  base,
  chantierHref,
}: {
  activity: DashboardActivity;
  base: string;
  chantierHref: ChantierHref;
}) {
  return (
    <ListCard
      id="chantiers-en-cours"
      title={t.inProgress.title}
      footer={
        activity.inProgress.length > 0 && (
          <TextLink href={`${base}/chantiers` as Route} className="self-start text-sm">
            {t.inProgress.all}
          </TextLink>
        )
      }
    >
      {activity.inProgress.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.inProgress.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {activity.inProgress.map((c) => {
            const share = c.totalCents > 0 ? Math.min(1, c.paidCents / c.totalCents) : 0;
            return (
              <li key={c.chantierId}>
                <Row href={chantierHref(c.chantierId)}>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="truncate text-sm font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {fr.pro.chantiers.status[c.status]}
                      </span>
                    </span>
                    {c.clientName && (
                      <span className="truncate text-xs text-muted-foreground">{c.clientName}</span>
                    )}
                    <span
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={c.totalCents}
                      aria-valuenow={c.paidCents}
                      aria-label={t.inProgress.paid(euro(c.paidCents), euro(c.totalCents))}
                      className="h-1.5 overflow-hidden rounded-pill bg-primary-soft"
                    >
                      <span
                        className="block h-full rounded-pill bg-primary"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.inProgress.paid(euro(c.paidCents), euro(c.totalCents))}
                    </span>
                  </span>
                </Row>
              </li>
            );
          })}
        </ul>
      )}
    </ListCard>
  );
}

/** Soldes à recevoir après la réception des travaux (ADR 0185). */
export function ReceivablesCard({
  activity,
  chantierHref,
}: {
  activity: DashboardActivity;
  chantierHref: ChantierHref;
}) {
  return (
    <ListCard id="soldes-a-recevoir" title={t.receivables.title} summary={t.receivables.hint}>
      {activity.receivables.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.receivables.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {activity.receivables.map((r) => (
            <li key={r.chantierId}>
              <Row href={chantierHref(r.chantierId)}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{r.title}</span>
                  {r.clientName && (
                    <span className="truncate text-xs text-muted-foreground">{r.clientName}</span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-medium">{euro(r.amountCents)}</span>
              </Row>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}
