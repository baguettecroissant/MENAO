import {
  expenseStatus,
  expensesSummary,
  matchesExpenseFilter,
  matchesExpenseQuery,
  type ExpenseFilter,
  type ExpenseRow,
  type ExpenseStatus,
} from "@menao/core";
import { Plus, Search } from "lucide-react";
import type { Route } from "next";
import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListHeader, ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { MoreMenu } from "@/components/more-menu";
import { ButtonLink, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ExampleBadge, ExampleLock } from "./examples";

const t = fr.pro.expenses;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
});

/** Couleur du statut ; l'orangé reste à « À classer », qui demande une action. */
export const EXPENSE_STATUS_TONE: Record<ExpenseStatus, ListTone> = {
  paye: "success",
  en_retard: "danger",
  a_payer: "neutral",
};

/**
 * Dépenses de l'artisan (F-62), en lignes (ADR 0189) : filtres avec le reste à payer et la part
 * en retard, recherche, puis une ligne par dépense (chantier ou « À classer », montant, état).
 * « Ajouter » seul en bouton principal ; exporter, envoi au comptable et factures électroniques
 * dans « … ». Exemples (ADR 0184) : pastille « Exemple », actions inactives, lignes sans lien.
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
    `${base}/depenses${value === "toutes" ? "" : `?statut=${value}`}`;
  const paidCount = expenses.length - summary.toPayCount;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        <ListHeader
          title={t.title}
          actions={
            <ExampleLock locked={example}>
              <div className="flex items-center gap-2">
                <MoreMenu
                  label={fr.pro.lists.more}
                  items={[
                    ...(expenses.length > 0
                      ? [
                          {
                            kind: "download" as const,
                            href: "/pro/depenses/export",
                            label: t.export,
                          },
                        ]
                      : []),
                    {
                      kind: "link" as const,
                      href: "/pro/comptable",
                      label: fr.pro.accountant.link,
                    },
                    {
                      kind: "soon" as const,
                      label: t.einvoice.button,
                      soon: t.einvoice.soon,
                      note: t.einvoice.text,
                    },
                  ]}
                />
                <ButtonLink href={`${base}/depenses/nouvelle` as Route}>
                  <Plus aria-hidden="true" className="size-4" />
                  {fr.pro.lists.add}
                </ButtonLink>
              </div>
            </ExampleLock>
          }
        />

        {expenses.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : (
          <>
            <ListFilters
              label={t.filtersLabel}
              items={[
                {
                  href: href("toutes"),
                  label: t.filters.toutes,
                  detail: String(expenses.length),
                  active: filter === "toutes",
                },
                {
                  href: href("a_payer"),
                  label: t.filters.a_payer,
                  detail: euros.format(summary.toPayCents / 100),
                  active: filter === "a_payer",
                },
                {
                  href: href("en_retard"),
                  label: t.filters.en_retard,
                  detail: euros.format(summary.overdueCents / 100),
                  active: filter === "en_retard",
                  tone: summary.overdueCount > 0 ? "danger" : undefined,
                },
                {
                  href: href("paye"),
                  label: t.filters.paye,
                  detail: String(paidCount),
                  active: filter === "paye",
                },
              ]}
            />
            <form role="search" action={`${base}/depenses`} className="relative">
              {filter !== "toutes" && <input type="hidden" name="statut" value={filter} />}
              <label htmlFor="expense-search" className="sr-only">
                {t.searchLabel}
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle-foreground"
              />
              <input
                id="expense-search"
                type="search"
                name="q"
                defaultValue={query}
                placeholder={t.searchPlaceholder}
                className={`${inputClasses} min-h-11 pl-11`}
              />
              <button type="submit" className="sr-only">
                {t.searchSubmit}
              </button>
            </form>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noResults}</p>
            ) : (
              <ListPanel label={t.title}>
                {rows.map((expense) => {
                  const status = expenseStatus(expense, today);
                  const chantier = expense.chantier_title ?? (
                    <span className="text-warning">{t.toClassify}</span>
                  );
                  return (
                    <ListRow
                      key={expense.id}
                      href={example ? undefined : `/pro/depenses/${expense.id}`}
                      label={t.open(expense.title)}
                      title={expense.title}
                      badge={example ? <ExampleBadge /> : undefined}
                      detail={
                        <>
                          {[shortDate.format(new Date(expense.issued_on)), expense.supplier_name]
                            .filter(Boolean)
                            .join(" · ")}
                          <span className="md:hidden"> · {chantier}</span>
                        </>
                      }
                      context={chantier}
                      value={euros.format(expense.total_ttc_cents / 100)}
                      status={{ text: t.statuses[status], tone: EXPENSE_STATUS_TONE[status] }}
                    />
                  );
                })}
              </ListPanel>
            )}
          </>
        )}
      </div>
    </main>
  );
}
