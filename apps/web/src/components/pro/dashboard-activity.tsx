import { revenueTicks, type DashboardActivity } from "@menao/core";
import { CalendarX2, ChevronRight, Plus, Share2 } from "lucide-react";
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
/** Grands chiffres de la refonte « Nette » (ADR 0245) : Inter Tight, gras, chiffres alignés. */
const figure = "font-display font-bold tracking-[-0.03em] tabular-nums leading-none";

/** Ligne de liste : lien vers le chantier, ou ligne simple quand il n'a pas de page (exemples). */
function Row({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <Link href={href as Route} className={rowLink}>
      {children}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
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
  /** Partager la fiche : le patron seulement (ADR 0241). */
  share?: string;
};

const pill =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";
const pillSecondary = `${pill} min-h-11 border border-border-strong bg-surface px-4 text-sm text-foreground hover:bg-background`;

/**
 * Actions de l'accueil (ADR 0185, refonte « Nette » ADR 0245) : « Préparer un devis » en bouton
 * principal, « Bloquer un créneau » et « Partager ma fiche » à côté. Téléphone : le bouton principal
 * sur toute la largeur, les deux autres côte à côte en dessous.
 */
export function DashboardActions({ links }: { links: DashboardShortcutLinks }) {
  return (
    <nav
      aria-label={t.shortcuts.title}
      className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center"
    >
      <Link
        href={links.quote as Route}
        className={`${pill} col-span-2 min-h-[3.125rem] bg-primary px-5 text-base text-primary-foreground hover:bg-primary-hover sm:order-last sm:min-h-11 sm:text-sm`}
      >
        <Plus aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2.4} />
        {t.shortcuts.quote}
      </Link>
      <Link
        href={links.block as Route}
        className={`${pillSecondary} ${links.share ? "" : "col-span-2"}`}
      >
        <CalendarX2 aria-hidden="true" className="hidden size-4 shrink-0 min-[400px]:block" />
        {t.shortcuts.block}
      </Link>
      {links.share && (
        <Link href={links.share as Route} className={pillSecondary}>
          <Share2 aria-hidden="true" className="hidden size-4 shrink-0 min-[400px]:block" />
          {t.shortcuts.share}
        </Link>
      )}
    </nav>
  );
}

/**
 * Bandeau de l'argent (refonte « Nette », ADR 0245) : encaissé ce mois avec son évolution, reste à
 * payer sur les devis signés et soldes à recevoir. Téléphone : le premier en grand, les deux autres
 * côte à côte dessous.
 */
export function MoneyBand({
  revenue,
  activity,
}: {
  revenue: { cents: number; trend: ReactNode };
  activity: DashboardActivity;
}) {
  const cells = [
    {
      key: "toCollect" as const,
      label: t.revenue.upcoming,
      value: euroRound(activity.upcomingCents),
      hint: t.revenue.upcomingHint,
    },
    {
      key: "receivables" as const,
      label: t.revenue.toCollect,
      value: euroRound(activity.toCollectCents),
      hint: t.revenue.toCollectHint,
    },
  ];
  return (
    <section
      aria-label={fr.pro.dashboard.money}
      className="grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface shadow-card md:grid-cols-3"
    >
      <div className="col-span-2 flex flex-col gap-2 border-b border-border p-5 md:col-span-1 md:border-r md:border-b-0 md:px-7 md:py-6">
        <span className="text-sm font-semibold text-label">{fr.pro.dashboard.revenue}</span>
        <span className={`${figure} text-[2.375rem] md:text-[2.5rem]`}>{euro(revenue.cents)}</span>
        {revenue.trend}
      </div>
      {cells.map((cell, i) => (
        <div
          key={cell.key}
          className={`flex min-w-0 flex-col gap-1 px-5 py-4 md:gap-2 md:px-7 md:py-6 ${
            i === 0 ? "border-r border-border" : ""
          }`}
        >
          <span className="text-[0.8125rem] font-semibold text-label md:text-sm">{cell.label}</span>
          <span className={`${figure} text-2xl md:text-[2.5rem]`}>{cell.value}</span>
          <span className="text-[0.8125rem] leading-snug text-muted-foreground md:text-sm">
            {cell.hint}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Petit chiffre sous le graphique : lien facultatif vers la liste concernée. */
export type RevenueStat = { label: string; value: string; hint?: string; href?: string };

function Stat({ label, value, hint, href }: RevenueStat) {
  const body = (
    <>
      <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
      <span className="font-display text-[1.375rem] font-bold tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </span>
      {hint && <span className="text-xs leading-snug text-muted-foreground">{hint}</span>}
    </>
  );
  return href ? (
    <Link
      href={href as Route}
      className="-mx-2 flex min-w-0 flex-col gap-0.5 rounded-input px-2 py-1.5 transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-col gap-0.5 py-1.5">{body}</div>
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
  stats = [],
}: {
  activity: DashboardActivity;
  years: number[];
  yearHref: (year: number) => string;
  /** Mois en cours (0 à 11) si l'année affichée est l'année en cours : les suivants sont à venir. */
  currentMonth: number | null;
  /** Chiffres sous le graphique (clients en attente, signature, temps de réponse, ADR 0245). */
  stats?: RevenueStat[];
}) {
  const ticks = revenueTicks(activity.months);
  const top = ticks.at(-1) ?? 0;
  const max = Math.max(...activity.months);
  const peak = activity.months.indexOf(max);
  const height = (cents: number) => (top > 0 ? (cents / top) * 100 : 0);
  return (
    <section aria-labelledby="chiffre-affaires" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="chiffre-affaires" className="text-xl">
            {t.revenue.titleYear(activity.year)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.revenue.collected}{" "}
            <strong className="font-bold text-foreground tabular-nums">
              {euroRound(activity.yearCents)}
            </strong>
          </p>
        </div>
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
                          className="w-[min(64%,2rem)] rounded-t-[4px] bg-primary"
                          style={{ height: `${height(cents)}%` }}
                        />
                        <span
                          className={`pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 rounded-chip px-1.5 py-0.5 text-xs font-bold whitespace-nowrap tabular-nums ${
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
                className={`text-center text-xs ${
                  i === currentMonth ? "font-bold text-foreground" : "text-muted-foreground"
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
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </dl>
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
        <h2 id={id} className="text-lg">
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
  const { pending, pendingTotalCents } = activity.quotes;
  return (
    <ListCard
      id="devis-en-attente"
      title={t.quotes.title}
      summary={
        pending.length ? t.quotes.summary(pending.length, euro(pendingTotalCents)) : undefined
      }
      footer={
        <TextLink
          href={`${base}/devis?onglet=envoyes` as Route}
          className="self-start text-sm font-semibold"
        >
          {t.quotes.all}
        </TextLink>
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
                  <span className="truncate font-semibold">{q.title}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {[q.clientName, q.sentAt ? t.quotes.sentOn(formatDay(q.sentAt)) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-display text-base font-bold tabular-nums">
                  {euro(q.totalTtcCents)}
                </span>
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
          <TextLink
            href={`${base}/chantiers` as Route}
            className="self-start text-sm font-semibold"
          >
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
                      <span className="truncate font-semibold">{c.title}</span>
                      <span className="rounded-chip bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-strong">
                        {fr.pro.chantiers.status[c.status]}
                      </span>
                    </span>
                    {c.clientName && (
                      <span className="truncate text-sm text-muted-foreground">{c.clientName}</span>
                    )}
                    <span
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={c.totalCents}
                      aria-valuenow={c.paidCents}
                      aria-label={t.inProgress.paid(euro(c.paidCents), euro(c.totalCents))}
                      className="h-2 overflow-hidden rounded-pill bg-background"
                    >
                      <span
                        className="block h-full rounded-pill bg-primary"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                    <span className="text-sm text-muted-foreground">
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
                  <span className="truncate font-semibold">{r.title}</span>
                  {r.clientName && (
                    <span className="truncate text-sm text-muted-foreground">{r.clientName}</span>
                  )}
                </span>
                <span className="shrink-0 font-display text-base font-bold tabular-nums">
                  {euro(r.amountCents)}
                </span>
              </Row>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}
