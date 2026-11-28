import { gainsMonthSteps, upcomingTotal, type GainsStep, type GainsStepKey } from "@menao/core";
import { ArrowRight, Banknote, Check, ChevronRight, PenLine, ReceiptText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parisDay, type Gains } from "@/lib/commercial/gains";
import { formatDayMonth, formatMonthName } from "@/lib/format";

const t = fr.commercialGains;
const r = fr.commercialResults;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const money = (cents: number) => euros.format(Math.round(cents / 100));
const shortMonth = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});
/** « 23 nov. » */
const formatDayShortMonth = (iso: string) => shortDay.format(new Date(iso));

export type StatementRow = {
  id: string;
  period_end: string;
  issued_at: string;
  total_cents: number;
  invoice_mode: string | null;
  invoice_issued_at: string | null;
  paid_at: string | null;
};

export type MonthBonus = {
  id: string;
  artisan: string | null;
  kind: string;
  status: string;
  amount_cents: number | null;
  created_at: string;
};

const ICONS: Record<GainsStepKey, typeof Check> = {
  primes: Check,
  releve: ReceiptText,
  facture: PenLine,
  virement: Banknote,
};

const STATE_CLASSES = {
  fait: "border-success bg-success text-white",
  next: "border-primary bg-primary text-white",
  todo: "border-border-strong bg-surface text-muted-foreground",
} as const;

function stepText(step: GainsStep, month: string, monthCents: number, today: string) {
  const s = t.steps;
  const day = step.date ? formatDayMonth(step.date) : "";
  switch (step.key) {
    case "primes":
      return [s.primes, monthCents > 0 ? s.primesDetail(money(monthCents)) : s.primesNone];
    case "releve":
      return [s.releve(month), s.releveOn(day)];
    case "facture":
      return [
        s.facture,
        step.state === "fait"
          ? s.factureDone(day)
          : step.date && today >= step.date
            ? s.factureLate
            : s.factureTodo(day),
      ];
    case "virement":
      return [s.virement, step.state === "fait" ? s.virementDone(day) : s.virementPlanned(day)];
  }
}

/** Le mois étape par étape : primes, relevé du 25, facture avant le 28, virement (ADR 0397). */
function StepsCard({
  steps,
  month,
  monthCents,
  href,
  today,
  compact = false,
}: {
  today: string;
  steps: GainsStep[];
  month: string;
  monthCents: number;
  href: string | null;
  compact?: boolean;
}) {
  const invoiceDone = steps.find((s) => s.key === "facture")?.state === "fait";
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
      <h2 className="text-lg">{compact ? t.steps.titleShort(month) : t.steps.title(month)}</h2>
      <ol className="flex flex-col gap-3.5">
        {steps.map((step) => {
          const Icon = ICONS[step.key];
          const [title, detail] = stepText(step, month, monthCents, today);
          return (
            <li key={step.key} className="flex items-start gap-3">
              <span
                className={`flex size-[2.125rem] shrink-0 items-center justify-center rounded-full border-2 ${STATE_CLASSES[step.state]}`}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="flex flex-col">
                <b className="text-[0.9375rem]">{title}</b>
                <span className="text-[0.8125rem] text-muted-foreground">{detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {href && (
        <Link
          href={href as Route}
          className={`${buttonClasses({ variant: "primary" })} justify-between`}
        >
          {invoiceDone ? t.steps.ctaView : compact ? t.steps.ctaShort : t.steps.cta}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </section>
  );
}

function PreviousStatements({ rows }: { rows: StatementRow[] }) {
  const p = t.previous;
  return (
    <section className="flex flex-col gap-2 rounded-card bg-background px-5 py-4 text-[0.84375rem] text-label">
      <b className="text-foreground">{p.title}</b>
      {rows.length === 0 ? (
        <p>{p.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-x-1.5">
              <span>
                {p.row(formatMonthName(row.period_end.slice(0, 7)), money(row.total_cents))} ·{" "}
                {row.paid_at
                  ? p.paidOn(formatDayMonth(row.paid_at))
                  : row.invoice_mode
                    ? p.waiting
                    : p.invoiceMissing}
              </span>
              <Link
                href={`/commercial/resultats/releve/${row.id}` as Route}
                className="font-semibold text-primary-strong hover:underline"
              >
                {p.pdf}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Haut de « Mes gains » (F-197, lot 86, ADR 0397) : gagné ce mois, à venir, payé dans l'année ; le
 * mois étape par étape (relevé du 25, facture, virement) ; six derniers mois sur téléphone, primes
 * du mois et relevés précédents sur ordinateur.
 */
export function GainsOverview({
  gains,
  statements,
  bonuses,
  today,
}: {
  gains: Gains;
  statements: StatementRow[];
  bonuses: MonthBonus[];
  today: string;
}) {
  const month = today.slice(0, 7);
  const monthName = formatMonthName(month);
  const current = statements.find((s) => s.period_end.slice(0, 7) === month) ?? null;
  const steps = gainsMonthSteps({
    today,
    monthCents: gains.mois_centimes,
    statementOn: current ? parisDay(current.issued_at) : null,
    invoiceOn: current?.invoice_issued_at ? parisDay(current.invoice_issued_at) : null,
    paidOn: current?.paid_at ? parisDay(current.paid_at) : null,
  });
  const href = current ? `/commercial/resultats/releve/${current.id}` : null;
  const upcoming = upcomingTotal(gains.a_venir);
  const previous = statements.filter((s) => s.id !== current?.id).slice(0, 3);
  const monthBonuses = bonuses.filter(
    (b) => b.status !== "annulee" && parisDay(b.created_at).slice(0, 7) === month,
  );
  const max = Math.max(1, ...gains.mois.map((m) => m.centimes));
  const year = today.slice(0, 4);
  const h = t.hero;
  const tb = t.table;

  return (
    <div className="flex flex-col gap-6">
      {/* Téléphone : le chiffre du mois en grand, à venir et payé dessous (maquette G86Gains). */}
      <section className="flex flex-col gap-1.5 rounded-[1.25rem] bg-foreground p-5 text-white lg:hidden">
        <span className="text-xs font-bold tracking-[0.06em] uppercase opacity-70">
          {h.earned(monthName)}
        </span>
        <b className="font-display text-[2.75rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {money(gains.mois_centimes)}
        </b>
        <span className="text-[0.84375rem] opacity-85">
          {h.detail(gains.validations_mois, gains.abonnements_mois)}
        </span>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Link
            href={"/commercial/resultats/a-venir" as Route}
            className="flex flex-col rounded-xl bg-white/10 px-3 py-2.5"
          >
            <span className="flex items-center justify-between text-xs opacity-75">
              {h.upcoming}
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </span>
            <b className="text-[1.0625rem]">{h.upTo(money(upcoming))}</b>
          </Link>
          <span className="flex flex-col rounded-xl bg-white/10 px-3 py-2.5">
            <span className="text-xs opacity-75">{h.paid(year)}</span>
            <b className="text-[1.0625rem]">{money(gains.payes_annee_centimes)}</b>
          </span>
        </div>
      </section>

      {/* Ordinateur : trois chiffres (maquette G86Bureau). */}
      <dl className="hidden gap-px overflow-hidden rounded-card border border-border bg-border shadow-card lg:grid lg:grid-cols-3">
        {[
          [
            h.earned(monthName),
            money(gains.mois_centimes),
            h.detail(gains.validations_mois, gains.abonnements_mois),
            null,
          ],
          [
            h.upcoming,
            h.upTo(money(upcoming)),
            h.upcomingHint(gains.a_venir.length),
            "/commercial/resultats/a-venir",
          ],
          [h.paid(year), money(gains.payes_annee_centimes), h.paidHint, null],
        ].map(([label, value, hint, link]) => (
          <div key={label} className="flex flex-col gap-1.5 bg-surface px-5 py-4">
            <dt className="text-sm font-semibold text-label">{label}</dt>
            <dd className="font-display text-[1.875rem] leading-tight font-bold tracking-tight tabular-nums">
              {value}
            </dd>
            <dd className="text-[0.8125rem] text-muted-foreground">
              {link ? (
                <Link
                  href={link as Route}
                  className="font-semibold text-primary-strong hover:underline"
                >
                  {hint} · {h.seeUpcoming}
                </Link>
              ) : (
                hint
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:hidden">
            <StepsCard
              steps={steps}
              month={monthName}
              monthCents={gains.mois_centimes}
              href={href}
              today={today}
            />
          </div>

          {/* Primes du mois (ordinateur). */}
          <section aria-labelledby="primes-mois" className="hidden flex-col gap-3 lg:flex">
            <h2 id="primes-mois" className="text-lg">
              {tb.title}
            </h2>
            <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
              <table className="w-full text-left text-[0.90625rem] whitespace-nowrap">
                <thead className="bg-background text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      {tb.artisan}
                    </th>
                    <th scope="col" className="px-2 py-3">
                      {tb.prime}
                    </th>
                    <th scope="col" className="px-2 py-3">
                      {tb.countedOn}
                    </th>
                    <th scope="col" className="px-2 py-3 text-right">
                      {tb.amount}
                    </th>
                    <th scope="col" className="py-3 pr-5 pl-4">
                      {tb.state}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthBonuses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 text-muted-foreground">
                        {tb.empty}
                      </td>
                    </tr>
                  ) : (
                    monthBonuses.map((b) => (
                      <tr key={b.id}>
                        <th scope="row" className="px-5 py-3 font-semibold">
                          {b.artisan || fr.commercialSpace.signups.unnamed}
                        </th>
                        <td className="px-2 py-3 text-label">{r.bonuses.kind[b.kind] ?? b.kind}</td>
                        <td className="px-2 py-3 text-label">
                          {formatDayShortMonth(b.created_at)}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums">
                          {b.amount_cents != null ? money(b.amount_cents) : "—"}
                        </td>
                        <td className="py-3 pr-5 pl-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              b.status === "payee"
                                ? "bg-success-soft text-success"
                                : b.status === "validee"
                                  ? "bg-primary-soft text-primary-strong"
                                  : "bg-border/70 text-label"
                            }`}
                          >
                            {r.bonuses.status[b.status] ?? b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Six derniers mois (téléphone). */}
          <section
            aria-labelledby="six-mois"
            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4 shadow-card lg:hidden"
          >
            <h2 id="six-mois" className="text-lg">
              {t.months.title}
            </h2>
            <div aria-hidden="true" className="flex h-[9.5rem] items-end gap-1">
              {gains.mois.map((m, i) => (
                <div key={m.mois} className="flex flex-1 flex-col items-center gap-1.5">
                  <b className="min-h-4 text-[0.71875rem] tabular-nums">
                    {m.centimes > 0 ? Math.round(m.centimes / 100) : ""}
                  </b>
                  <span
                    className={`w-[70%] rounded-t-md rounded-b-sm ${i === gains.mois.length - 1 ? "bg-primary" : "bg-primary-soft"}`}
                    style={{ height: `${Math.max(6, Math.round((m.centimes / max) * 110))}px` }}
                  />
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {shortMonth.format(new Date(`${m.mois}-15T12:00:00Z`))}
                  </span>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>{t.months.caption}</caption>
              <tbody>
                {gains.mois.map((m) => (
                  <tr key={m.mois}>
                    <th scope="row">{formatMonthName(m.mois)}</th>
                    <td>{money(m.centimes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="lg:hidden">
            <PreviousStatements rows={previous} />
          </div>
        </div>
        <aside className="hidden flex-col gap-4 lg:flex">
          <StepsCard
            steps={steps}
            month={monthName}
            monthCents={gains.mois_centimes}
            href={href}
            today={today}
            compact
          />
          <PreviousStatements rows={previous} />
        </aside>
      </div>
    </div>
  );
}
