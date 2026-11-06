import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ArtisanExpensesScreen } from "@/components/pro/expenses-screen";
import { ArtisanInvoicesScreen } from "@/components/pro/invoices-screen";
import { MONEY_VIEWS, MoneySwitcher, type MoneyView } from "@/components/pro/money-switcher";
import { MoneyOverviewScreen } from "@/components/pro/money-overview-screen";
import { ArtisanQuotesScreen } from "@/components/pro/quotes-screen";
import { loadMoneyOverview } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";

const asView = (value: string | undefined): MoneyView =>
  MONEY_VIEWS.find((view) => view === value) ?? "devis";

/**
 * Onglet « Argent » de l'artisan (ADR 0188), comme la rubrique du site : devis, factures et
 * dépenses, d'une puce, et « Suivi » si la formule comprend l'agent comptable avancé (ADR 0237).
 * `?vue=factures`, `?vue=depenses` ou `?vue=suivi` ouvre directement la liste voulue.
 */
export default function MoneyTab() {
  const { vue } = useLocalSearchParams<{ vue?: string }>();
  const [view, setView] = useState<MoneyView>(asView(vue));
  const [overview, reloadOverview] = useFocusData(loadMoneyOverview, undefined, "tab:suivi");
  // Nouveau lien vers l'onglet : la vue demandée remplace la vue en cours.
  const [lastVue, setLastVue] = useState(vue);
  if (vue !== lastVue) {
    setLastVue(vue);
    setView(asView(vue));
  }
  const included = overview?.included === true;
  const shown: MoneyView = view === "suivi" && overview !== undefined && !included ? "devis" : view;
  const switcher = <MoneySwitcher value={shown} onChange={setView} overview={included} />;
  if (shown === "suivi" && overview !== undefined) {
    return (
      <MoneyOverviewScreen overview={overview} switcher={switcher} onRefresh={reloadOverview} />
    );
  }
  if (shown === "factures") return <ArtisanInvoicesScreen switcher={switcher} />;
  if (shown === "depenses") return <ArtisanExpensesScreen switcher={switcher} />;
  return <ArtisanQuotesScreen switcher={switcher} />;
}
