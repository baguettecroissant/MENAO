import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ArtisanChantiersScreen } from "@/components/pro/chantiers-screen";
import { ArtisanQuotesScreen } from "@/components/pro/quotes-screen";
import { WorkSwitcher, type WorkView } from "@/components/pro/work-switcher";

/**
 * Onglet « Chantiers » de l'artisan (F-18, ADR 0130) : ses chantiers et, d'une puce, ses devis
 * (à envoyer et envoyés). `?vue=devis` ouvre directement les devis.
 */
export default function ChantiersTab() {
  const { vue } = useLocalSearchParams<{ vue?: string }>();
  const [view, setView] = useState<WorkView>(vue === "devis" ? "devis" : "chantiers");
  // Nouveau lien vers l'onglet (« Devis » de l'accueil) : la vue demandée remplace la vue en cours.
  const [lastVue, setLastVue] = useState(vue);
  if (vue !== lastVue) {
    setLastVue(vue);
    if (vue === "devis" || vue === "chantiers") setView(vue);
  }
  const switcher = <WorkSwitcher value={view} onChange={setView} />;
  return view === "devis" ? (
    <ArtisanQuotesScreen switcher={switcher} />
  ) : (
    <ArtisanChantiersScreen switcher={switcher} />
  );
}
