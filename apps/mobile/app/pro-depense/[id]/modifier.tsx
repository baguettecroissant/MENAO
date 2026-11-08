import { formatEurosInput } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ExpenseFormView } from "@/components/pro/expense-form";
import { FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadExpense, loadExpenseChantiers } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proExpenses;

/** Modification d'une dépense (F-62) : mêmes champs, pièce remplaçable. */
function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(
    async () => Promise.all([loadExpense(id), loadExpenseChantiers()]),
    [id],
  );
  const [data] = useFocusData(load);
  const title = t.form.editTitle;
  if (data === undefined) return <FicheSkeleton title={title} />;
  const [expense, chantiers] = data ?? [null, []];
  if (!expense) {
    return (
      <FicheScreen title={title}>
        <Notice tone="error">{t.detail.notFound}</Notice>
      </FicheScreen>
    );
  }
  return (
    <ExpenseFormView
      title={title}
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
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", EditExpenseScreen);
