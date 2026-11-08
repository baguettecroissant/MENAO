import { parisToday } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { ExpenseFormView } from "@/components/pro/expense-form";
import { FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadExpenseChantiers } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import { withTeamPermission } from "@/components/team-gate";

/**
 * Nouvelle dépense (F-62), comme sur le site ; `?chantier=` pré-choisit le chantier, `?photo=1`
 * (« Photo du ticket ») ouvre l'appareil photo dès l'arrivée.
 */
function NewExpenseScreen() {
  const { chantier, photo } = useLocalSearchParams<{ chantier?: string; photo?: string }>();
  const [chantiers] = useFocusData(loadExpenseChantiers);
  const title = fr.proExpenses.form.newTitle;
  if (chantiers === undefined) return <FicheSkeleton title={title} />;
  const list = chantiers ?? [];
  return (
    <ExpenseFormView
      title={title}
      expenseId={null}
      initial={{
        title: "",
        supplierName: "",
        reference: "",
        kind: "facture",
        category: "",
        issuedOn: parisToday(),
        dueOn: "",
        paidOn: "",
        paid: false,
        chantierId: list.some((c) => c.id === chantier) ? (chantier ?? "") : "",
        totalHt: "",
        totalTva: "",
        notes: "",
      }}
      initialLines={[]}
      hasDocument={false}
      chantiers={list}
      takePhoto={photo === "1"}
    />
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", NewExpenseScreen);
