"use client";

import { Download } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, CardTitle, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { markCommercialInvoicePaid } from "@/lib/admin/commercial-actions";

const t = fr.commercialGains.admin;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const day = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export type AdminStatementRow = {
  id: string;
  commercial: string;
  period_end: string;
  total_cents: number;
  invoice_id: string | null;
  invoice_mode: "preparee" | "deposee" | null;
  invoice_number: string | null;
  total_ttc_cents: number | null;
  paid_at: string | null;
  payout_reference: string | null;
  has_iban: boolean;
};

function MarkPaid({ invoice }: { invoice: string }) {
  const [state, action, pending] = useActionState(markCommercialInvoicePaid, initialFormState);
  if (state.success) return <span className="text-sm text-success">{state.success}</span>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" noValidate>
      <input type="hidden" name="invoice" value={invoice} />
      <label className="sr-only" htmlFor={`ref-${invoice}`}>
        {t.reference}
      </label>
      <input
        id={`ref-${invoice}`}
        name="reference"
        placeholder={t.reference}
        defaultValue={state.values?.reference ?? ""}
        maxLength={100}
        className="h-9 w-40 rounded-input border border-border bg-surface px-2.5 text-sm"
      />
      <Button type="submit" variant="secondary" size="sm" block={false} disabled={pending}>
        {t.markPaid}
      </Button>
      {(state.error || state.fieldErrors?.reference) && (
        <Alert tone="error">{state.error ?? state.fieldErrors?.reference?.[0]}</Alert>
      )}
    </form>
  );
}

/**
 * Back-office : relevés du mois des conseillers, leurs factures (émises ou déposées) et les
 * virements, avec le fichier de virement pour la banque et l'export du comptable (ADR 0397).
 */
export function CommercialStatementsCard({
  month,
  rows,
}: {
  month: string;
  rows: AdminStatementRow[];
}) {
  const received = rows.filter((r) => r.invoice_id);
  const toPay = received
    .filter((r) => !r.paid_at)
    .reduce((sum, r) => sum + (r.total_ttc_cents ?? r.total_cents), 0);
  const statementDay = rows[0]?.period_end ?? `${month}-25`;
  const f = t.figures;
  const c = t.columns;
  return (
    <Card className="flex flex-col gap-4 overflow-x-auto">
      <CardTitle title={t.title} description={t.lead} />
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
        {[
          [f.statements(day.format(new Date(statementDay))), String(rows.length), f.statementsHint],
          [f.invoices, f.invoicesValue(received.length, rows.length), f.invoicesHint],
          [f.toPay, money(toPay), f.toPayHint],
        ].map(([label, value, hint]) => (
          <div key={label} className="flex flex-col gap-1 bg-surface px-4 py-3">
            <dt className="text-sm font-semibold text-label">{label}</dt>
            <dd className="text-xl font-bold tabular-nums">{value}</dd>
            <dd className="text-[0.8125rem] text-muted-foreground">{hint}</dd>
          </div>
        ))}
      </dl>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-3">
                {c.commercial}
              </th>
              <th scope="col" className="py-2 pr-3">
                {c.statement}
              </th>
              <th scope="col" className="py-2 pr-3">
                {c.invoice}
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                {c.amount}
              </th>
              <th scope="col" className="py-2">
                {c.transfer}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="py-3 pr-3 font-semibold">
                  {r.commercial}
                </th>
                <td className="py-3 pr-3 tabular-nums">
                  <Link
                    href={`/admin/releves-conseillers/${r.id}` as Route}
                    className="text-primary-strong hover:underline"
                  >
                    {money(r.total_cents)}
                  </Link>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.invoice_id ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                    }`}
                  >
                    {r.invoice_mode === "preparee"
                      ? t.invoice.preparee(r.invoice_number ?? "")
                      : r.invoice_mode === "deposee"
                        ? t.invoice.deposee
                        : t.invoice.waiting}
                  </span>
                  {r.invoice_mode === "preparee" && (
                    <Link
                      href={`/admin/releves-conseillers/${r.id}?type=facture` as Route}
                      className="ml-2 text-xs font-semibold text-primary-strong hover:underline"
                    >
                      {t.viewInvoice}
                    </Link>
                  )}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {r.total_ttc_cents != null
                    ? `${money(r.total_ttc_cents)} ${t.ttc}`
                    : r.invoice_mode === "deposee"
                      ? `${money(r.total_cents)} ${t.htOnly}`
                      : "—"}
                </td>
                <td className="py-3">
                  {r.paid_at ? (
                    <span className="text-success">
                      {t.paidOn(day.format(new Date(r.paid_at)))}
                      {r.payout_reference ? ` · ${r.payout_reference}` : ""}
                    </span>
                  ) : r.invoice_id ? (
                    <div className="flex flex-col gap-1">
                      <MarkPaid invoice={r.invoice_id} />
                      {!r.has_iban && <span className="text-xs text-warning">{t.noIban}</span>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t.afterReceipt}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap gap-2.5">
        <a
          href={`/admin/commerciaux/virements?mois=${month}`}
          className={buttonClasses({ variant: "primary", size: "sm", block: false })}
        >
          <Download aria-hidden="true" className="size-4" />
          {t.transfers}
        </a>
        <a
          href={`/admin/commerciaux/factures?mois=${month}`}
          className={buttonClasses({ variant: "secondary", size: "sm", block: false })}
        >
          <Download aria-hidden="true" className="size-4" />
          {t.ledger}
        </a>
      </div>
      <p className="text-xs text-muted-foreground">{t.note}</p>
    </Card>
  );
}
