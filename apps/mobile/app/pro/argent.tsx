import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ArtisanExpensesScreen } from "@/components/pro/expenses-screen";
import { ArtisanInvoicesScreen } from "@/components/pro/invoices-screen";
import { MONEY_VIEWS, MoneySwitcher, type MoneyView } from "@/components/pro/money-switcher";
import { ArtisanQuotesScreen } from "@/components/pro/quotes-screen";

const asView = (value: string | undefined): MoneyView =>
  MONEY_VIEWS.find((view) => view === value) ?? "devis";

/**
 * Onglet « Argent » de l'artisan (ADR 0188), comme la rubrique du site : devis, factures et
 * dépenses, d'une puce. `?vue=factures` ou `?vue=depenses` ouvre directement la liste voulue.
 */
export default function MoneyTab() {
  const { vue } = useLocalSearchParams<{ vue?: string }>();
  const [view, setView] = useState<MoneyView>(asView(vue));
  // Nouveau lien vers l'onglet : la vue demandée remplace la vue en cours.
  const [lastVue, setLastVue] = useState(vue);
  if (vue !== lastVue) {
    setLastVue(vue);
    setView(asView(vue));
  }
  const switcher = <MoneySwitcher value={view} onChange={setView} />;
  if (view === "factures") return <ArtisanInvoicesScreen switcher={switcher} />;
  if (view === "depenses") return <ArtisanExpensesScreen switcher={switcher} />;
  return <ArtisanQuotesScreen switcher={switcher} />;
}
