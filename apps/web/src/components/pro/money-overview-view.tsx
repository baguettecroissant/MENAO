import {
  canRemindNow,
  daysSince,
  lateOpenCount,
  moneyMonthDeltas,
  moneyMonthLabel,
  nextAutoReminder,
  openItemLevel,
  openTotalCents,
  type MoneyOpenItem,
  type MoneyOverview,
} from "@menao/core";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AutoRemindersForm, RemindButton } from "@/components/pro/money-reminders";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";

const t = fr.pro.moneyOverview;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
/** Chiffres du mois arrondis à l'euro (maquette du lot 37). */
const wholeEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const whole = (cents: number) => wholeEuros.format(Math.round(cents / 100));

/** Écart sur le mois précédent : flèche et couleur (vert si c'est une bonne nouvelle). */
function Delta({ cents, good, month }: { cents: number; good: boolean; month: string | null }) {
  if (cents === 0 || !month) return null;
  const Icon = cents > 0 ? TrendingUp : TrendingDown;
  const value = `${cents > 0 ? "+" : "−"}${whole(Math.abs(cents))}`;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold ${good ? "text-success" : "text-danger"}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>
        {value}
        <span className="sr-only sm:not-sr-only"> {t.deltaVs(month)}</span>
      </span>
    </span>
  );
}

/** Les trois relances (J+7, J+15, J+30) : faites en plein, à venir en creux. */
function ReminderTrail({ sent }: { sent: number }) {
  const done = Math.min(3, sent);
  return (
    <span
      role="img"
      aria-label={t.remindersDone(done)}
      className="inline-flex items-center gap-1.5"
    >
      {t.autoSteps.map(([step], i) => (
        <span key={step} className="inline-flex items-center gap-1.5">
          {i > 0 && (
            <span
              aria-hidden="true"
              className={`h-0.5 w-4 sm:w-5 ${i < done ? "bg-foreground" : "bg-border"}`}
            />
          )}
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${i < done ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${i < done ? "bg-foreground" : "border-2 border-border-strong bg-surface"}`}
            />
            {step}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * « Suivi » de la rubrique Argent (F-87, ADR 0237 ; maquette du lot 37), agent comptable avancé
 * (Premium et Entreprise) : le mois en bref comparé au précédent, ce qui reste à encaisser avec
 * son ancienneté et ses relances, le réglage des relances automatiques et ce qui cloche. Des
 * chiffres seulement, aucun conseil.
 */
export function MoneyOverviewView({ overview, now }: { overview: MoneyOverview; now: Date }) {
  const month = moneyMonthLabel(overview.current.month);
  const previousMonth = moneyMonthLabel(overview.previous.month) || null;
  const deltas = moneyMonthDeltas(overview);
  const late = lateOpenCount(overview.open, now);
  const tiles: { label: string; value: string; detail: ReactNode }[] = [
    {
      label: t.collected,
      value: whole(overview.current.collectedCents),
      detail: (
        <Delta
          cents={deltas.collectedCents}
          good={deltas.collectedCents > 0}
          month={previousMonth}
        />
      ),
    },
    {
      label: t.signed,
      value: whole(overview.current.signedCents),
      detail: (
        <span className="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted-foreground">
          {t.signedCount(overview.current.signedQuotes)}
          <Delta cents={deltas.signedCents} good={deltas.signedCents > 0} month={previousMonth} />
        </span>
      ),
    },
    {
      label: t.open,
      value: whole(openTotalCents(overview.open)),
      detail: (
        <span className="text-[0.8125rem] text-muted-foreground">
          {t.openLate(overview.open.length, late)}
        </span>
      ),
    },
    {
      label: t.expenses,
      value: whole(overview.current.expensesCents),
      detail: (
        <Delta cents={deltas.expensesCents} good={deltas.expensesCents < 0} month={previousMonth} />
      ),
    },
  ];
  const info = (item: MoneyOpenItem) => {
    if (item.lastReminder) return t.lastReminder(formatDay(item.lastReminder), item.reminders);
    const next = overview.autoReminders ? nextAutoReminder(item.since, now) : null;
    return next ? t.nextAuto(formatDay(next)) : null;
  };

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        <section aria-labelledby="mois" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="mois" className="text-xl leading-tight sm:text-[1.375rem]">
              {month ? t.monthTitle(month) : t.title}
            </h2>
            <p className="text-[0.8125rem] text-muted-foreground">{t.ttc}</p>
          </div>
          <dl className="grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface shadow-card lg:grid-cols-4">
            {tiles.map((tile, i) => (
              <div
                key={tile.label}
                className={`flex flex-col gap-1.5 p-4 sm:gap-2 sm:px-5 sm:py-5 ${i % 2 ? "border-l border-border" : ""} ${i > 1 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
              >
                <dt className="text-sm font-semibold text-label">{tile.label}</dt>
                <dd className="font-display text-2xl leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums xl:text-[2.125rem]">
                  {tile.value}
                </dd>
                <dd>{tile.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section
            aria-labelledby="a-encaisser"
            className="@container overflow-hidden rounded-card border border-border bg-surface shadow-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 pb-3 sm:px-5">
              <h2 id="a-encaisser" className="text-lg font-semibold">
                {t.openTitle}
              </h2>
              {overview.open.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t.openTotal(money(openTotalCents(overview.open)), overview.open.length)}
                </span>
              )}
            </div>
            {overview.open.length === 0 ? (
              <p className="border-t border-border px-4 py-5 text-sm text-muted-foreground sm:px-5">
                {t.openEmpty}
              </p>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="hidden gap-4 bg-background px-5 py-2 text-xs font-bold text-muted-foreground @2xl:flex"
                >
                  <span className="flex-1">{t.columns.item}</span>
                  <span className="w-52 text-center">{t.columns.reminders}</span>
                  <span className="w-36 text-right">{t.columns.amount}</span>
                </div>
                <ul className="flex flex-col">
                  {overview.open.map((item) => {
                    const days = daysSince(item.since, now);
                    const level = openItemLevel(days);
                    const line = info(item);
                    return (
                      <li
                        key={`${item.chantierId}-${item.kind}`}
                        className="flex flex-col gap-2.5 border-t border-border px-4 py-4 sm:px-5 @2xl:flex-row @2xl:items-center @2xl:gap-4"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex min-w-0 flex-col">
                              <Link
                                href={`/pro/chantiers/${item.chantierId}` as Route}
                                className="truncate font-semibold hover:underline"
                              >
                                {item.chantier}
                              </Link>
                              <span className="text-[0.8125rem] text-muted-foreground">
                                {t.kinds[item.kind]}
                              </span>
                            </span>
                            <span className="font-semibold whitespace-nowrap tabular-nums @2xl:hidden">
                              {money(item.amountCents)}
                            </span>
                          </div>
                          <span className="flex flex-wrap items-center gap-1.5">
                            {days !== null && (
                              <StatusBadge
                                tone={
                                  level === "en_retard"
                                    ? "danger"
                                    : level === "a_relancer"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {t.dueSince(days)}
                              </StatusBadge>
                            )}
                            {item.failed && <StatusBadge tone="danger">{t.failed}</StatusBadge>}
                          </span>
                          {line && <span className="text-xs text-muted-foreground">{line}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-3 @2xl:contents">
                          <span className="@2xl:flex @2xl:w-52 @2xl:justify-center">
                            <ReminderTrail sent={item.reminders} />
                          </span>
                          <span className="flex flex-col items-end gap-2 @2xl:w-36">
                            <span className="font-display hidden text-lg font-bold whitespace-nowrap tabular-nums @2xl:block">
                              {money(item.amountCents)}
                            </span>
                            <RemindButton
                              chantierId={item.chantierId}
                              kind={item.kind}
                              allowed={canRemindNow(item.lastReminder, now)}
                            />
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{t.autoTitle}</h2>
                <AutoRemindersForm enabled={overview.autoReminders} />
              </div>
              <p className="text-sm text-muted-foreground">{t.autoShort}</p>
              <ul className="flex flex-col gap-2.5">
                {t.autoSteps.map(([step, label]) => (
                  <li key={step} className="flex items-center gap-3 text-sm text-label">
                    <span className="inline-flex h-7 w-12 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-bold text-foreground">
                      {step}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
              <p className="text-[0.8125rem] text-muted-foreground">{t.autoManual}</p>
            </Card>

            {overview.withoutInvoice.length > 0 && (
              <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">{t.checkTitle}</h2>
                <ul className="flex flex-col divide-y divide-border">
                  {overview.withoutInvoice.map((item) => (
                    <li
                      key={`${item.chantierId}-${item.kind}-${item.paidAt}`}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0"
                    >
                      <span className="flex min-w-0 flex-col">
                        <Link
                          href={`/pro/chantiers/${item.chantierId}` as Route}
                          className="truncate text-sm font-semibold hover:underline"
                        >
                          {item.chantier}
                        </Link>
                        <span className="text-[0.8125rem] text-muted-foreground">
                          {t.withoutInvoice(t.kinds[item.kind] ?? "")}
                          {item.paidAt ? ` · ${formatDay(item.paidAt)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                        {money(item.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[0.8125rem] text-muted-foreground">
                  {t.withoutInvoiceHint}{" "}
                  <Link
                    href="/pro/aide"
                    className="font-semibold text-primary-strong hover:underline"
                  >
                    {t.help}
                  </Link>
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
