import { exampleExpenses, parseExpenseFilter, parisToday } from "@menao/core";
import type { Metadata } from "next";
import { ExpenseList } from "@/components/pro/expense-list";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.expenses.title} — MENAO` };

/** Dépenses d'exemple (ADR 0184, F-62) : achats du chantier en cours, location en retard. */
export default async function ExampleExpensesPage({
  searchParams,
}: PageProps<"/pro/decouvrir/depenses">) {
  const { statut, q } = await searchParams;
  await requireExampleViewer();
  return (
    <ExpenseList
      expenses={exampleExpenses()}
      filter={parseExpenseFilter(statut)}
      query={typeof q === "string" ? q.slice(0, 100) : ""}
      today={parisToday()}
      base={EXAMPLES_BASE}
      example
    />
  );
}
