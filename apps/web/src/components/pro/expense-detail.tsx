import { expenseStatus, formatQuantity } from "@menao/core";
import { unit as unitLabel } from "@menao/documents";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  StatusBadge,
  TextLink,
  buttonClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteExpense, setExpensePaid } from "@/lib/artisan/expense-actions";
import type { ExpenseDetail } from "@/lib/artisan/expenses";
import { formatDay } from "@/lib/format";
import { EXPENSE_STATUS_TONE } from "./expense-list";

const t = fr.pro.expenses;
const d = t.detail;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

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
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/pro/depenses"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary-strong hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {d.back}
        </Link>
        {documentFailed && <Alert tone="error">{d.documentFailed}</Alert>}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {expense.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={EXPENSE_STATUS_TONE[status]}>{t.statuses[status]}</StatusBadge>
              <span className="text-sm text-muted-foreground">
                {status === "paye" && expense.paid_on
                  ? d.paidOn(formatDay(expense.paid_on))
                  : status === "en_retard" && expense.due_on
                    ? d.overdueSince(formatDay(expense.due_on))
                    : expense.due_on
                      ? d.dueOn(formatDay(expense.due_on))
                      : null}
              </span>
            </div>
          </div>
          <p className="shrink-0 text-2xl font-medium">
            {euros.format(expense.total_ttc_cents / 100)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={setExpensePaid.bind(null, expense.id, status !== "paye")}>
            <Button
              type="submit"
              variant={status === "paye" ? "secondary" : "primary"}
              block={false}
              className="w-full sm:w-auto"
            >
              {status === "paye" ? d.markUnpaid : d.markPaid}
            </Button>
          </form>
          <ButtonLink href={`/pro/depenses/${expense.id}/modifier` as Route} variant="secondary">
            <Pencil aria-hidden="true" className="size-4" />
            {d.edit}
          </ButtonLink>
        </div>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{d.document}</h2>
          {documentUrl ? (
            <>
              {isImage && (
                <a href={documentUrl} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4) */}
                  <img
                    src={documentUrl}
                    alt={d.documentAlt(expense.title)}
                    className="max-h-[32rem] w-full rounded-input border border-border bg-background object-contain"
                  />
                </a>
              )}
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener"
                className={`${buttonClasses({ variant: "outline", block: false })} self-start`}
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                {d.openDocument}
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{d.noDocument}</p>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{d.info}</h2>
          <dl className="flex flex-col divide-y divide-border">
            {expense.supplier_name && <Row label={d.rows.supplier}>{expense.supplier_name}</Row>}
            {expense.reference && <Row label={d.rows.reference}>{expense.reference}</Row>}
            <Row label={d.rows.chantier}>
              {expense.chantier_id && expense.chantier_title ? (
                <TextLink href={`/pro/chantiers/${expense.chantier_id}` as Route}>
                  {expense.chantier_title}
                </TextLink>
              ) : (
                <StatusBadge tone="warning">{t.toClassify}</StatusBadge>
              )}
            </Row>
            <Row label={d.rows.issuedOn}>{formatDay(expense.issued_on)}</Row>
            {expense.due_on && <Row label={d.rows.dueOn}>{formatDay(expense.due_on)}</Row>}
            <Row label={d.rows.kind}>{t.kinds[expense.kind]}</Row>
            {expense.category && (
              <Row label={d.rows.category}>{t.categories[expense.category]}</Row>
            )}
            {expense.notes && <Row label={d.rows.notes}>{expense.notes}</Row>}
          </dl>
          <dl className="mt-2 flex flex-col rounded-input bg-background px-4 py-2">
            <Row label={d.totals.ht}>{euros.format(expense.total_ht_cents / 100)}</Row>
            <Row label={d.totals.tva}>{euros.format(expense.total_tva_cents / 100)}</Row>
            <Row label={d.totals.ttc}>
              <span className="font-medium">{euros.format(expense.total_ttc_cents / 100)}</span>
            </Row>
          </dl>
        </Card>

        {expense.lines.length > 0 && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">{d.lines}</h2>
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
                        line.unitPriceHtCents !== null && euros.format(line.unitPriceHtCents / 100),
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
          </Card>
        )}

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
      </div>
    </main>
  );
}
