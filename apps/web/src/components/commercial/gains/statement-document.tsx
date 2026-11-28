import { invoiceNumber, payoutDate, VAT_EXEMPTION_NOTE } from "@menao/core";
import { Logo } from "@/components/brand/logo";
import { COMPANY } from "@/content/legal/company";
import { fr } from "@/i18n/fr";
import { parisDay, type Statement } from "@/lib/commercial/gains";
import { formatDay, formatDayMonth, formatMonthName } from "@/lib/format";

const t = fr.commercialGains.document;
const plans = fr.commercialResults.bonuses.scale.plans as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

/** Mois du relevé : « novembre 2026 ». */
export function statementMonth(statement: Statement) {
  const month = statement.period_end.slice(0, 7);
  return `${formatMonthName(month)} ${month.slice(0, 4)}`;
}

function Lines({
  statement,
  totals,
}: {
  statement: Statement;
  totals: { label: string; value: string; strong?: boolean }[];
}) {
  const c = t.columns;
  return (
    <table className="w-full border-collapse text-left text-[0.8125rem]">
      <thead>
        <tr className="text-[0.6875rem] tracking-[0.04em] text-muted-foreground uppercase">
          <th className="pb-1.5 font-semibold">{c.artisan}</th>
          <th className="pb-1.5 font-semibold">{c.prime}</th>
          <th className="pb-1.5 font-semibold">{c.acquired}</th>
          <th className="pb-1.5 text-right font-semibold">{c.amount}</th>
        </tr>
      </thead>
      <tbody>
        {statement.lines.map((line, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-2 pr-2">{line.artisan}</td>
            <td className="py-2 pr-2 text-label">
              {[
                t.kind[line.kind] ?? line.kind,
                line.kind === "abonnement" && line.plan ? plans[line.plan] : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </td>
            <td className="py-2 pr-2 text-label">
              {line.validated_at ? formatDay(line.validated_at) : "—"}
            </td>
            <td className="py-2 text-right tabular-nums">
              {line.amount_cents != null ? money(line.amount_cents) : "—"}
            </td>
          </tr>
        ))}
        {totals.map((row) => (
          <tr key={row.label}>
            <td
              colSpan={3}
              className={`py-1.5 text-right ${row.strong ? "font-bold" : "text-label"}`}
            >
              {row.label}
            </td>
            <td
              className={`py-1.5 pl-3 text-right tabular-nums ${row.strong ? "text-[0.9375rem] font-bold" : ""}`}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const sheet =
  "mx-auto flex w-full max-w-[794px] flex-col gap-6 rounded-card border border-border bg-white px-6 py-10 text-[0.84375rem] leading-normal text-foreground shadow-card sm:px-16 sm:py-14 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none";

/** Relevé des primes du mois (contrat, article 11 ; R134-3), au format A4. */
export function StatementSheet({ statement }: { statement: Statement }) {
  const issued = parisDay(statement.issued_at);
  return (
    <article className={sheet}>
      <Logo className="h-7 w-auto" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.statementTitle(statementMonth(statement))}
        </h1>
        <p className="text-label">
          {t.period(
            formatDay(statement.period_start),
            formatDay(statement.period_end),
            formatDay(issued),
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <b>{t.agent}</b>
          <br />
          {statement.agent}
          <br />
          {t.agentRole}
          {statement.rsac ? `, ${t.rsac(statement.rsac, statement.rsac_greffe)}` : ""}
        </div>
        <div>
          <b>{t.principal}</b>
          <br />
          {COMPANY.name}
          <br />
          {COMPANY.address}
        </div>
      </div>
      <Lines
        statement={statement}
        totals={[{ label: t.total, value: money(statement.total_cents), strong: true }]}
      />
      <p className="rounded-input bg-background px-4 py-3 text-xs text-label">{t.rights}</p>
      <p className="text-xs text-label">{t.invoiceHint(formatDayMonth(payoutDate(issued)))}</p>
    </article>
  );
}

/**
 * Facture du conseiller : émise (identité figée à l'émission) ou aperçu de la facture préparée
 * avec ses informations de facturation actuelles. TODO(legal) : facture préparée par MENAO au nom
 * de l'agent (ADR 0397), mentions à faire relire.
 */
export function InvoiceSheet({ statement }: { statement: Statement }) {
  const invoice = statement.invoice?.mode === "preparee" ? statement.invoice : null;
  const billing = statement.billing;
  const seller = invoice?.seller ?? (billing ? { ...billing, rsac: statement.rsac } : null);
  if (!seller) return null;
  const vatMode = invoice?.vat_mode ?? billing?.vat_mode ?? "franchise";
  const vat =
    invoice?.vat_cents ?? (vatMode === "assujetti" ? Math.round(statement.total_cents * 0.2) : 0);
  const issued = invoice ? parisDay(invoice.issued_at) : null;
  const number =
    invoice?.number ?? (billing ? invoiceNumber(billing.invoice_prefix, billing.next_number) : "");
  const month = statementMonth(statement);
  return (
    <article className={sheet}>
      {!invoice && (
        <p className="rounded-input border border-dashed border-border-strong px-4 py-2 text-xs text-label print:hidden">
          {t.draft}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <b className="text-xl tracking-tight">{seller.legal_name}</b>
        <span>
          {t.agentRole} · {t.siret(seller.siret)}
        </span>
        {seller.rsac && <span>{t.rsac(seller.rsac, statement.rsac_greffe)}</span>}
        {seller.vat_number && <span>{t.vatNumber(seller.vat_number)}</span>}
        <span>{seller.address}</span>
      </div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-[1.625rem] font-bold tracking-tight">
            {invoice ? t.invoiceTitle(number) : t.draftTitle}
          </h1>
          {issued && (
            <p className="text-label">
              {t.issuedDue(formatDay(issued), formatDay(payoutDate(issued)))}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <b>{t.billedTo}</b>
          <br />
          {COMPANY.name}
          <br />
          {COMPANY.address}
        </div>
      </div>
      <p>
        <b>{t.objectLabel}</b> {t.object(month, formatDay(statement.period_end))}
      </p>
      <Lines
        statement={statement}
        totals={[
          { label: t.totalHt, value: money(statement.total_cents) },
          vatMode === "assujetti"
            ? { label: t.vat20, value: money(vat) }
            : { label: t.vat, value: VAT_EXEMPTION_NOTE.replace(/^TVA /, "") },
          { label: t.totalDue, value: money(statement.total_cents + vat), strong: true },
        ]}
      />
      <p className="text-xs text-label">
        {t.payment(`•••• •••• •••• ${seller.iban_end}`)}
        <br />
        {t.terms}
      </p>
    </article>
  );
}
