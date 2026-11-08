import { expenseStatus, formatQuantity } from "@menao/core";
import { unit as unitLabel } from "@menao/documents";
import { Check, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import { Alert, Button, ButtonLink, StatusBadge, TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteExpense, setExpensePaid } from "@/lib/artisan/expense-actions";
import type { ExpenseDetail } from "@/lib/artisan/expenses";
import { formatDay } from "@/lib/format";
import { EXPENSE_STATUS_TONE } from "./expense-list";
import { SheetChip, SheetHeader, SheetPage, SheetRow, sheetCard } from "./sheet";

const CHIP_TONE: Record<string, "neutral" | "primary" | "success" | "warning" | "danger"> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  primary: "primary",
  neutral: "neutral",
};

const t = fr.pro.expenses;
const d = t.detail;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Fiche d'une dépense (F-62) : statut, pièce (URL signée), informations, totaux et lignes lues ;
 * « Marquer comme payée », « Modifier » et « Supprimer la dépense ».
 */
export function ExpenseDetailView({
  expense,
  documentUrl,
  today,
  documentFailed,
}: {
  expense: ExpenseDetail;
  documentUrl: string | null;
  today: string;
  documentFailed: boolean;
}) {
  const status = expenseStatus(expense, today);
  const isImage = expense.document_mime?.startsWith("image/") ?? false;
  const when =
    status === "paye" && expense.paid_on
      ? d.paidOn(formatDay(expense.paid_on))
      : status === "en_retard" && expense.due_on
        ? d.overdueSince(formatDay(expense.due_on))
        : expense.due_on
          ? d.dueOn(formatDay(expense.due_on))
          : null;
  // Refonte « Nette » (ADR 0253) : en-tête à grand titre et actions, la pièce à gauche, le total
  // et les détails à droite.
  return (
    <SheetPage>
      {documentFailed && <Alert tone="error">{d.documentFailed}</Alert>}
      <SheetHeader
        backHref="/pro/depenses"
        backLabel={d.back}
        chips={
          <>
            {expense.category && <SheetChip>{t.categories[expense.category]}</SheetChip>}
            <SheetChip tone={CHIP_TONE[EXPENSE_STATUS_TONE[status]] ?? "neutral"} dot>
              {[t.statuses[status], when].filter(Boolean).join(" · ")}
            </SheetChip>
          </>
        }
        title={expense.title}
        meta={
          [expense.supplier_name, expense.reference, formatDay(expense.issued_on)]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        aside={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={`/pro/depenses/${expense.id}/modifier` as Route}
              variant="secondary"
              block={false}
            >
              <Pencil aria-hidden="true" className="size-4" />
              {d.edit}
            </ButtonLink>
            <form action={setExpensePaid.bind(null, expense.id, status !== "paye")}>
              <Button
                type="submit"
                variant={status === "paye" ? "secondary" : "primary"}
                block={false}
              >
                {status !== "paye" && <Check aria-hidden="true" className="size-4" />}
                {status === "paye" ? d.markUnpaid : d.markPaid}
              </Button>
            </form>
          </div>
        }
      />
      <div className="grid items-start gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="piece" className={sheetCard}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="piece" className="text-lg">
                {d.document}
              </h2>
              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong hover:underline"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  {d.openDocument}
                </a>
              )}
            </div>
            {documentUrl ? (
              isImage && (
                <a href={documentUrl} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4) */}
                  <img
                    src={documentUrl}
                    alt={d.documentAlt(expense.title)}
                    className="max-h-[32rem] w-full rounded-xl border border-border bg-background object-contain"
                  />
                </a>
              )
            ) : (
              <p className="text-sm text-muted-foreground">{d.noDocument}</p>
            )}
          </section>
          {expense.lines.length > 0 && (
            <section className={sheetCard}>
              <h2 className="text-lg">{d.lines}</h2>
              <ul className="flex flex-col divide-y divide-border">
                {expense.lines.map((line, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">{line.designation}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          line.quantityMilli !== null &&
                            d.lineQuantity(
                              formatQuantity(line.quantityMilli),
                              line.unit ? unitLabel(line.unit) : null,
                            ),
                          line.unitPriceHtCents !== null &&
                            euros.format(line.unitPriceHtCents / 100),
                          line.reference,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {line.totalHtCents !== null && (
                      <span className="shrink-0 text-sm">
                        {euros.format(line.totalHtCents / 100)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section aria-labelledby="total-depense" className={sheetCard}>
            <div className="flex flex-col gap-1">
              <h2 id="total-depense" className="font-sans text-sm font-semibold text-label">
                {d.totals.ttc}
              </h2>
              <span className="font-display text-[2.25rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {euros.format(expense.total_ttc_cents / 100)}
              </span>
            </div>
            <dl>
              <SheetRow label={d.totals.ht}>{euros.format(expense.total_ht_cents / 100)}</SheetRow>
              <SheetRow label={d.totals.tva}>
                {euros.format(expense.total_tva_cents / 100)}
              </SheetRow>
            </dl>
          </section>
          <section aria-labelledby="infos-depense" className={sheetCard}>
            <h2 id="infos-depense" className="text-lg">
              {d.info}
            </h2>
            <dl>
              {expense.supplier_name && (
                <SheetRow label={d.rows.supplier}>{expense.supplier_name}</SheetRow>
              )}
              {expense.reference && (
                <SheetRow label={d.rows.reference}>{expense.reference}</SheetRow>
              )}
              <SheetRow label={d.rows.chantier}>
                {expense.chantier_id && expense.chantier_title ? (
                  <TextLink href={`/pro/chantiers/${expense.chantier_id}` as Route}>
                    {expense.chantier_title}
                  </TextLink>
                ) : (
                  <StatusBadge tone="warning">{t.toClassify}</StatusBadge>
                )}
              </SheetRow>
              <SheetRow label={d.rows.issuedOn}>{formatDay(expense.issued_on)}</SheetRow>
              {expense.due_on && (
                <SheetRow label={d.rows.dueOn}>{formatDay(expense.due_on)}</SheetRow>
              )}
              <SheetRow label={d.rows.kind}>{t.kinds[expense.kind]}</SheetRow>
              {expense.category && (
                <SheetRow label={d.rows.category}>{t.categories[expense.category]}</SheetRow>
              )}
              {expense.notes && <SheetRow label={d.rows.notes}>{expense.notes}</SheetRow>}
            </dl>
          </section>
          <details className="group rounded-card border border-border bg-surface p-4 shadow-card">
            <summary
              className={`${buttonClasses({ variant: "danger-text", block: false })} cursor-pointer list-none`}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {d.delete}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm">{d.deleteConfirm}</p>
              <form action={deleteExpense.bind(null, expense.id)}>
                <Button type="submit" variant="danger" block={false}>
                  {d.deleteSubmit}
                </Button>
              </form>
            </div>
          </details>
        </aside>
      </div>
    </SheetPage>
  );
}
