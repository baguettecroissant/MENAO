import {
  EXPENSE_FILTERS,
  expenseStatus,
  expensesSummary,
  matchesExpenseFilter,
  matchesExpenseQuery,
  type ExpenseFilter,
  type ExpenseRow,
  type ExpenseStatus,
} from "@menao/core";
import { FileDown, Plus, Search, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ButtonLink, StatusBadge, Tag, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { EinvoiceButton } from "./einvoice-button";
import { ExampleBadge, ExampleLock } from "./examples";

const t = fr.pro.expenses;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Couleur du statut ; l'orangé reste à « À classer », qui demande une action. */
export const EXPENSE_STATUS_TONE: Record<ExpenseStatus, "success" | "danger" | "neutral"> = {
  paye: "success",
  en_retard: "danger",
  a_payer: "neutral",
};

/**
 * Dépenses de l'artisan (F-62) : reste à payer, onglets par statut, recherche, puis la liste avec
 * le chantier de chaque dépense ou « À classer ». Exemples (ADR 0184) : pastille « Exemple »,
 * actions inactives et lignes sans lien (`example`).
 */
export function ExpenseList({
  expenses,
  filter,
  query,
  today,
  base = "/pro",
  example = false,
}: {
  expenses: readonly ExpenseRow[];
  filter: ExpenseFilter;
  query: string;
  today: string;
  base?: string;
  example?: boolean;
}) {
  const rows = expenses.filter(
    (e) => matchesExpenseFilter(e, filter, today) && matchesExpenseQuery(e, query),
  );
  const summary = expensesSummary(expenses, today);
  const href = (value: ExpenseFilter) =>
    `${base}/depenses${value === "toutes" ? "" : `?statut=${value}`}` as Route;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <ExampleLock locked={example}>
            <ButtonLink href={`${base}/depenses/nouvelle` as Route} className="shrink-0">
              <Plus aria-hidden="true" className="size-4" />
              {t.add}
            </ButtonLink>
          </ExampleLock>
        </div>

        <ExampleLock locked={example}>
          <div className="flex flex-wrap items-start gap-2">
            {expenses.length > 0 && (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- fichier CSV téléchargé (route), pas une page
              <a
                href="/pro/depenses/export"
                className={buttonClasses({ variant: "secondary", block: false })}
              >
                <FileDown aria-hidden="true" className="size-4" />
                {t.export}
              </a>
            )}
            <ButtonLink href="/pro/comptable" variant="secondary">
              <Send aria-hidden="true" className="size-4" />
              {fr.pro.accountant.link}
            </ButtonLink>
            <EinvoiceButton />
          </div>
        </ExampleLock>

        {expenses.length > 0 && (
          <section
            aria-label={t.summaryLabel}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-card border border-border bg-surface px-5 py-4 shadow-card"
          >
            {summary.toPayCount === 0 ? (
              <p className="font-medium text-success">{t.nothingToPay}</p>
            ) : (
              <>
                <p className="text-lg font-medium">
                  {t.toPay(euros.format(summary.toPayCents / 100))}
                </p>
                {summary.overdueCount > 0 && (
                  <p className="text-sm font-medium text-danger">
                    {t.overdue(euros.format(summary.overdueCents / 100))}
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {expenses.length > 0 && (
          <div className="flex flex-col gap-3">
            <nav
              aria-label={t.filtersLabel}
              className="flex gap-1 overflow-x-auto rounded-pill bg-surface p-1 shadow-card"
            >
              {EXPENSE_FILTERS.map((value) => (
                <Link
                  key={value}
                  href={href(value)}
                  aria-current={filter === value ? "page" : undefined}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-pill px-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
                >
                  {t.filters[value]}
                </Link>
              ))}
            </nav>
            <form role="search" action={`${base}/depenses`} className="flex gap-2">
              {filter !== "toutes" && <input type="hidden" name="statut" value={filter} />}
              <label htmlFor="expense-search" className="sr-only">
                {t.searchLabel}
              </label>
              <input
                id="expense-search"
                type="search"
                name="q"
                defaultValue={query}
                placeholder={t.searchPlaceholder}
                className={inputClasses}
              />
              <button
                type="submit"
                aria-label={t.searchSubmit}
                className={`${buttonClasses({ variant: "secondary", block: false })} shrink-0`}
              >
                <Search aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
        )}

        {expenses.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noResults}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((expense) => {
              const status = expenseStatus(expense, today);
              const body = (
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{expense.title}</span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-medium">
                        {euros.format(expense.total_ttc_cents / 100)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.ht(euros.format(expense.total_ht_cents / 100))}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      formatDateNumeric(expense.issued_on),
                      expense.supplier_name,
                      expense.reference && `N° ${expense.reference}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={EXPENSE_STATUS_TONE[status]}>
                      {t.statuses[status]}
                    </StatusBadge>
                    {expense.chantier_title ? (
                      <Tag tone="neutral" className="max-w-full">
                        <span className="truncate">{expense.chantier_title}</span>
                      </Tag>
                    ) : (
                      <StatusBadge tone="warning">{t.toClassify}</StatusBadge>
                    )}
                    {example && <ExampleBadge />}
                  </span>
                </>
              );
              const card =
                "flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5";
              return (
                <li key={expense.id}>
                  {example ? (
                    <div className={card}>{body}</div>
                  ) : (
                    <Link
                      href={`/pro/depenses/${expense.id}` as Route}
                      aria-label={t.open(expense.title)}
                      className={`${card} transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none`}
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
