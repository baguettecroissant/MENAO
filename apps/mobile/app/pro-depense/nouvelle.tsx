import { parisToday } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { ExpenseFormView } from "@/components/pro/expense-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadExpenseChantiers } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import { Screen, ScreenSkeleton, Title } from "@/ui";

/** Nouvelle dépense (F-62), comme sur le site ; `?chantier=` pré-choisit le chantier. */
export default function NewExpenseScreen() {
  const { chantier } = useLocalSearchParams<{ chantier?: string }>();
  const [chantiers] = useFocusData(loadExpenseChantiers);
  if (chantiers === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const list = chantiers ?? [];
  return (
    <Screen header={<TopBar />}>
      <Title>{fr.proExpenses.form.newTitle}</Title>
      <ExpenseFormView
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
      />
    </Screen>
  );
}
