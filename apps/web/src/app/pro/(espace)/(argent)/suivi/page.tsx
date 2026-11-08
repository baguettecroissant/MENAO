import {
  canRemindNow,
  daysSince,
  moneyMonthLabel,
  openItemLevel,
  openTotalCents,
  parseMoneyOverview,
} from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRemindersForm, RemindButton } from "@/components/pro/money-reminders";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { formatDay } from "@/lib/format";

const t = fr.pro.moneyOverview;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Suivi » de la rubrique Argent (F-87, ADR 0237), agent comptable avancé (Premium et
 * Entreprise) : le mois en bref, ce qui reste à encaisser avec son ancienneté, et ce qui cloche.
 * Des chiffres seulement, aucun conseil.
 */
export default async function MoneyOverviewPage() {
  const { supabase } = await requireTeamPermission("money");
  const { data } = await supabase.rpc("my_money_overview");
  const overview = parseMoneyOverview(data);
  if (!overview?.included) redirect("/pro/devis" as Route);

  const now = new Date();
  const month = moneyMonthLabel(overview.current.month);
  const previousMonth = moneyMonthLabel(overview.previous.month);
  const prev = (value: string) => (previousMonth ? t.previous(previousMonth, value) : null);
  const tiles: { label: string; value: string; detail: string | null }[] = [
    {
      label: t.collected,
      value: money(overview.current.collectedCents),
      detail: prev(money(overview.previous.collectedCents)),
    },
    {
      label: t.signed,
      value: money(overview.current.signedCents),
      detail: `${t.signedCount(overview.current.signedQuotes)}${
        previousMonth ? ` · ${t.previous(previousMonth, money(overview.previous.signedCents))}` : ""
      }`,
    },
    {
      label: t.open,
      value: money(openTotalCents(overview.open)),
      detail: t.openCount(overview.open.length),
    },
    {
      label: t.expenses,
      value: money(overview.current.expensesCents),
      detail: prev(money(overview.previous.expensesCents)),
    },
  ];

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-5 pb-10 sm:px-6">
        <section aria-labelledby="mois" className="flex flex-col gap-3">
          <h2 id="mois" className="text-xl leading-tight">
            {month ? t.monthTitle(month) : t.title}
          </h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <Card key={tile.label} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{tile.label}</dt>
                <dd className="text-xl font-medium tabular-nums">{tile.value}</dd>
                {tile.detail && <dd className="text-xs text-muted-foreground">{tile.detail}</dd>}
              </Card>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">{t.ttc}</p>
        </section>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.openTitle}</h2>
          {overview.open.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.openEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {overview.open.map((item) => {
                const days = daysSince(item.since, now);
                const level = openItemLevel(days);
                return (
                  <li
                    key={`${item.chantierId}-${item.kind}`}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={`/pro/chantiers/${item.chantierId}` as Route}
                        className="truncate font-medium hover:underline"
                      >
                        {item.chantier}
                      </Link>
                      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {t.kinds[item.kind]}
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
                      {item.lastReminder && (
                        <span className="text-xs text-muted-foreground">
                          {t.lastReminder(formatDay(item.lastReminder), item.reminders)}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-medium tabular-nums">{money(item.amountCents)}</span>
                      <RemindButton
                        chantierId={item.chantierId}
                        kind={item.kind}
                        allowed={canRemindNow(item.lastReminder, now)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{t.autoTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.autoText}</p>
          <AutoRemindersForm enabled={overview.autoReminders} />
        </Card>

        {overview.withoutInvoice.length > 0 && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{t.checkTitle}</h2>
            <ul className="flex flex-col divide-y divide-border">
              {overview.withoutInvoice.map((item) => (
                <li
                  key={`${item.chantierId}-${item.kind}-${item.paidAt}`}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/pro/chantiers/${item.chantierId}` as Route}
                      className="truncate font-medium hover:underline"
                    >
                      {item.chantier}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {t.withoutInvoice(t.kinds[item.kind] ?? "")}
                      {item.paidAt ? ` · ${formatDay(item.paidAt)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {money(item.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              {t.withoutInvoiceHint}{" "}
              <Link href="/pro/aide" className="font-medium text-primary-strong hover:underline">
                {t.help}
              </Link>
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
