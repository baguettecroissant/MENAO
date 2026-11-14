import { parisToday } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpenseDetailView } from "@/components/pro/expense-detail";
import { fr } from "@/i18n/fr";
import { expenseDocumentUrl, loadExpense } from "@/lib/artisan/expenses";
import { loadExpensePriceChanges } from "@/lib/artisan/library-invoices";
import { requireTeamPermission } from "@/lib/artisan/space";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${fr.pro.expenses.title} — MENAO` };

/** Fiche d'une dépense (F-62). `?piece=echec` : la pièce n'a pas pu être rangée. */
export default async function ExpensePage({
  params,
  searchParams,
}: PageProps<"/pro/depenses/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { piece } = await searchParams;
  const { supabase } = await requireTeamPermission("money");
  const expense = await loadExpense(supabase, id);
  if (!expense) notFound();
  const [documentUrl, priceChanges] = await Promise.all([
    expense.document_path ? expenseDocumentUrl(supabase, expense.document_path) : null,
    // Prix d'achat que cette facture permet de mettre à jour (F-149, lot 44).
    expense.lines.length > 0 ? loadExpensePriceChanges(supabase, id, expense.issued_on) : null,
  ]);
  return (
    <ExpenseDetailView
      expense={expense}
      documentUrl={documentUrl}
      today={parisToday()}
      documentFailed={piece === "echec"}
      priceChanges={priceChanges}
    />
  );
}
