import type { ConnectOverview, Payout } from "@menao/core";
import { ArrowDownToLine, CalendarClock, Landmark, Wallet } from "lucide-react";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";

const t = fr.pro.onboarding.connect.overview;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
// Dates Stripe au format AAAA-MM-JJ (jour de Paris) : affichées à midi pour éviter tout décalage.
const day = (iso: string) => formatDay(`${iso}T12:00:00`);

function scheduleText(schedule: ConnectOverview["schedule"]): string | null {
  if (!schedule) return null;
  switch (schedule.interval) {
    case "daily":
      return t.schedule.daily;
    case "weekly":
      return t.schedule.weekly(t.weekdays[schedule.weeklyAnchor ?? ""] ?? t.weekdays.monday!);
    case "monthly":
      return t.schedule.monthly(schedule.monthlyAnchor ?? 1);
    case "manual":
      return t.schedule.manual;
  }
}

/**
 * « Votre argent » (ADR 0152) : solde, prochain virement, frais du mois et derniers virements, lus
 * chez Stripe pour le compte de l'artisan, avec l'encaissé via MENAO. Lecture seule : les actions
 * restent dans son tableau de bord Stripe.
 */
export function ConnectOverviewPanel({
  overview,
  collected,
}: {
  overview: ConnectOverview | null;
  collected: { monthCents: number; yearCents: number };
}) {
  return (
    <section aria-labelledby="votre-argent" className="flex flex-col gap-5">
      <h2 id="votre-argent" className="text-lg font-medium">
        {t.title}
      </h2>
      {overview === null ? (
        <Alert tone="info">{t.unavailable}</Alert>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Figure
              icon={<Wallet aria-hidden="true" className="size-4" />}
              label={t.available}
              value={money(overview.availableCents)}
              hint={t.availableHint}
              strong
            />
            <Figure
              icon={<CalendarClock aria-hidden="true" className="size-4" />}
              label={t.pending}
              value={money(overview.pendingCents)}
              hint={t.pendingHint}
            />
            <Figure
              icon={<ArrowDownToLine aria-hidden="true" className="size-4" />}
              label={t.nextPayout}
              value={overview.nextPayout ? money(overview.nextPayout.amountCents) : "—"}
              hint={
                overview.nextPayout
                  ? t.nextPayoutOn(day(overview.nextPayout.arrivalDate))
                  : t.noPayout
              }
            />
            <Figure
              icon={<Landmark aria-hidden="true" className="size-4" />}
              label={t.collectedMonth}
              value={money(collected.monthCents)}
              hint={t.collectedYear(money(collected.yearCents))}
            />
          </dl>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {overview.bank && <li>{t.bank(overview.bank.name, overview.bank.last4)}</li>}
            {scheduleText(overview.schedule) && <li>{scheduleText(overview.schedule)}</li>}
            {overview.schedule?.delayDays ? <li>{t.delay(overview.schedule.delayDays)}</li> : null}
            <li>
              {t.fees} : {money(overview.feesThisMonthCents)}
            </li>
          </ul>
          {overview.recentPayouts.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t.recent}</h3>
              <ul className="divide-y divide-border rounded-input border border-border">
                {overview.recentPayouts.map((payout, i) => (
                  <PayoutRow key={`${payout.arrivalDate}-${i}`} payout={payout} />
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-subtle-foreground">{t.readOnly}</p>
        </>
      )}
    </section>
  );
}

function Figure({
  icon,
  label,
  value,
  hint,
  strong = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border p-4 ${strong ? "border-primary-soft bg-primary-softer" : "border-border bg-surface"}`}
    >
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </dt>
      <dd className="text-2xl font-medium tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  const tone =
    payout.status === "paid"
      ? "text-success"
      : payout.status === "failed" || payout.status === "canceled"
        ? "text-danger"
        : "text-primary-strong";
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span>{day(payout.arrivalDate)}</span>
      <span className="flex items-center gap-3">
        <span className={`text-xs font-medium ${tone}`}>{t.status[payout.status]}</span>
        <span className="font-medium tabular-nums">{money(payout.amountCents)}</span>
      </span>
    </li>
  );
}
