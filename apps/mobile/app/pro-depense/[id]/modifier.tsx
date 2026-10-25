import { formatEurosInput } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ExpenseFormView } from "@/components/pro/expense-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadExpense, loadExpenseChantiers } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, ScreenSkeleton, Title } from "@/ui";

const t = fr.proExpenses;

/** Modification d'une dépense (F-62) : mêmes champs, pièce remplaçable. */
export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(
    async () => Promise.all([loadExpense(id), loadExpenseChantiers()]),
    [id],
  );
  const [data] = useFocusData(load);
  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const [expense, chantiers] = data ?? [null, []];
  if (!expense) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.detail.notFound}</Notice>
      </Screen>
    );
  }
  return (
    <Screen header={<TopBar />}>
      <Title>{t.form.editTitle}</Title>
      <ExpenseFormView
        expenseId={expense.id}
        initial={{
          title: expense.title,
          supplierName: expense.supplier_name ?? "",
          reference: expense.reference ?? "",
          kind: expense.kind,
          category: expense.category ?? "",
          issuedOn: expense.issued_on,
          dueOn: expense.due_on ?? "",
          paidOn: expense.paid_on ?? "",
          paid: expense.paid_on !== null,
          chantierId: expense.chantier_id ?? "",
          totalHt: formatEurosInput(expense.total_ht_cents),
          totalTva: formatEurosInput(expense.total_tva_cents),
          notes: expense.notes ?? "",
        }}
        initialLines={expense.lines}
        hasDocument={expense.document_path !== null}
        chantiers={chantiers}
      />
    </Screen>
  );
}
