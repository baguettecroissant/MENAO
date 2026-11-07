import { parseExpenseFilter, parisToday, teamCan } from "@menao/core";
import type { Metadata } from "next";
import { ExpenseList } from "@/components/pro/expense-list";
import { fr } from "@/i18n/fr";
import { loadExpenses } from "@/lib/artisan/expenses";
import { requireTeamPermission } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.expenses.title} — MENAO` };

/** Dépenses de l'artisan (F-62) : achats et leurs pièces, rattachés à ses chantiers. */
export default async function ExpensesPage({ searchParams }: PageProps<"/pro/depenses">) {
  const { statut, q } = await searchParams;
  const { supabase, teamPosition } = await requireTeamPermission("money");
  const expenses = await loadExpenses(supabase);
  return (
    <ExpenseList
      expenses={expenses}
      filter={parseExpenseFilter(statut)}
      query={typeof q === "string" ? q.slice(0, 100) : ""}
      today={parisToday()}
      accounting={teamCan(teamPosition, "accounting")}
    />
  );
}
