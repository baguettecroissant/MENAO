/**
 * Dépenses de l'artisan (F-62, ADR 0186) : achats de fournitures, d'outillage, locations… avec leur
 * pièce, rattachés à un chantier ou « à classer ». MENAO ne paie rien : c'est un suivi, le statut
 * de paiement est indiqué par l'artisan. Montants en centimes, TTC toujours calculé (HT + TVA).
 * Catégories, types de pièce et limites : expense-reading.ts (partagé avec l'Edge Function).
 */
import type { ExpenseCategory, ExpenseKind } from "./expense-reading";

/** Dépense de la liste et de la fiche (table expenses, avec le titre du chantier). */
export type ExpenseRow = {
  id: string;
  title: string;
  supplier_name: string | null;
  reference: string | null;
  kind: ExpenseKind;
  category: ExpenseCategory | null;
  issued_on: string;
  due_on: string | null;
  paid_on: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  chantier_id: string | null;
  chantier_title: string | null;
  /** Type de la pièce rangée (null : sans pièce). */
  document_mime: string | null;
};

export const EXPENSE_STATUSES = ["a_payer", "en_retard", "paye"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Onglets de la liste : toutes les dépenses, ou un statut. */
export const EXPENSE_FILTERS = ["toutes", ...EXPENSE_STATUSES] as const;
export type ExpenseFilter = (typeof EXPENSE_FILTERS)[number];

type Dated = { paid_on: string | null; due_on: string | null };

/** Payée (date de paiement indiquée), en retard (échéance passée), sinon à payer. */
export function expenseStatus(expense: Dated, today: string): ExpenseStatus {
  if (expense.paid_on) return "paye";
  if (expense.due_on && expense.due_on < today) return "en_retard";
  return "a_payer";
}

export function parseExpenseFilter(value: unknown): ExpenseFilter {
  return EXPENSE_FILTERS.find((filter) => filter === value) ?? "toutes";
}

/** Une dépense en retard reste à payer : l'onglet « À payer » la montre aussi. */
export function matchesExpenseFilter(
  expense: Dated,
  filter: ExpenseFilter,
  today: string,
): boolean {
  if (filter === "toutes") return true;
  const status = expenseStatus(expense, today);
  return filter === "a_payer" ? status !== "paye" : status === filter;
}

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Recherche dans le titre, le fournisseur et le numéro de la pièce, sans accents ni majuscules. */
export function matchesExpenseQuery(
  expense: { title: string; supplier_name: string | null; reference: string | null },
  query: string,
): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(
    [expense.title, expense.supplier_name, expense.reference].filter(Boolean).join(" "),
  );
  return words.every((word) => haystack.includes(word));
}

/** Reste à payer (TTC), dont la part en retard, pour l'en-tête de la liste. */
export function expensesSummary(
  expenses: readonly (Dated & { total_ttc_cents: number })[],
  today: string,
): { toPayCents: number; toPayCount: number; overdueCents: number; overdueCount: number } {
  const summary = { toPayCents: 0, toPayCount: 0, overdueCents: 0, overdueCount: 0 };
  for (const expense of expenses) {
    const status = expenseStatus(expense, today);
    if (status === "paye") continue;
    summary.toPayCents += expense.total_ttc_cents;
    summary.toPayCount += 1;
    if (status === "en_retard") {
      summary.overdueCents += expense.total_ttc_cents;
      summary.overdueCount += 1;
    }
  }
  return summary;
}
