import { commercialInvoiceTotals, invoiceNumber, payoutDate } from "@menao/core";
import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { statementMonth } from "@/components/commercial/gains/statement-document";
import { DepositInvoice, IssueInvoice } from "@/components/commercial/gains/invoice-actions";
import { Alert, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getStatement, parisDay } from "@/lib/commercial/gains";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDayLong, formatDayMonth } from "@/lib/format";

const t = fr.commercialGains.statement;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

export const metadata: Metadata = {
  title: `${fr.commercialGains.steps.ctaShort} — MENAO`,
  robots: { index: false },
};

/**
 * Le relevé du mois et sa facture (F-197, lot 86, ADR 0397) : facture préparée à émettre en un
 * toucher après vérification, ou facture du conseiller à déposer ; puis son état jusqu'au virement.
 */
export default async function CommercialStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCommercialSpace(`/commercial/resultats/releve/${id}`);
  if (!space.active) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
      </main>
    );
  }
  const statement = await getStatement(space.supabase, id);
  if (!statement) notFound();
  const invoice = statement.invoice;
  const billing = statement.billing;
  const totals =
    invoice?.mode === "preparee"
      ? {
          ht: invoice.total_ht_cents,
          vat: invoice.vat_cents ?? 0,
          ttc: invoice.total_ttc_cents ?? 0,
        }
      : billing
        ? commercialInvoiceTotals(statement.total_cents, billing.vat_mode)
        : null;
  const vatMode = invoice?.vat_mode ?? billing?.vat_mode ?? null;
  const issuedOn = invoice ? parisDay(invoice.issued_at) : parisDay(new Date().toISOString());
  const payout = invoice?.paid_at ? parisDay(invoice.paid_at) : payoutDate(issuedOn);
  const status = invoice?.paid_at
    ? t.status.paid
    : invoice
      ? t.status[invoice.mode]
      : t.status.ready;
  const number =
    invoice?.number ??
    (billing ? invoiceNumber(billing.invoice_prefix, billing.next_number) : null);
  let depositedUrl: string | null = null;
  if (invoice?.mode === "deposee" && !space.demo) {
    const { data: row } = await space.supabase
      .from("commercial_invoices")
      .select("file_path")
      .eq("id", invoice.id)
      .maybeSingle();
    if (row?.file_path) {
      const { data: signed } = await space.supabase.storage
        .from("commercial-documents")
        .createSignedUrl(row.file_path, 600);
      depositedUrl = signed?.signedUrl ?? null;
    }
  }
  const docs = `/commercial/documents/${statement.id}`;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/commercial/resultats" as Route}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight sm:text-[2rem]">
          {t.title(statementMonth(statement))}
        </h1>

        <section className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <b className="text-[1.0625rem]">{number ?? "—"}</b>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                invoice?.paid_at
                  ? "bg-success-soft text-success"
                  : invoice
                    ? "bg-success-soft text-success"
                    : "bg-primary-soft text-primary-strong"
              }`}
            >
              {status}
            </span>
          </div>
          <dl className="flex flex-col text-sm">
            {[
              [
                t.lines(statement.lines.length, formatDayMonth(statement.period_end)),
                `${money(statement.total_cents)} HT`,
              ],
              [
                t.vat,
                invoice?.mode === "deposee"
                  ? t.vatUnknown
                  : vatMode === "assujetti"
                    ? `${t.vatRate} · ${money(totals?.vat ?? 0)}`
                    : t.vatExempt,
              ],
              ...(totals && invoice?.mode !== "deposee" ? [[t.toPay, money(totals.ttc)]] : []),
              [t.transfer, formatDayLong(payout)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-t border-border py-1.5">
                <dt className="text-label">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            {invoice?.mode !== "deposee" && billing && (
              <Link
                href={`${docs}?type=facture` as Route}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <FileText aria-hidden="true" className="size-4" />
                {t.viewInvoice}
              </Link>
            )}
            {depositedUrl && (
              <a
                href={depositedUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <FileText aria-hidden="true" className="size-4" />
                {t.viewDeposited}
              </a>
            )}
            <Link
              href={docs as Route}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <FileText aria-hidden="true" className="size-4" />
              {t.viewStatement}
            </Link>
          </div>
        </section>

        {!invoice &&
          (billing ? (
            <IssueInvoice statementId={statement.id} />
          ) : (
            <Alert tone="info">
              {t.needBilling}{" "}
              <Link href={"/commercial/facturation" as Route} className="font-semibold underline">
                {t.billingLink}
              </Link>
            </Alert>
          ))}
        {(!invoice || (invoice.mode === "deposee" && !invoice.paid_at)) && (
          <DepositInvoice statementId={statement.id} replace={invoice?.mode === "deposee"} />
        )}
        <p className="text-[0.8125rem] text-muted-foreground">{t.note}</p>
      </div>
    </main>
  );
}
