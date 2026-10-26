import { loadConversations } from "./messages";
import { loadArtisanChantiers } from "./pro-chantiers";
import { loadArtisanInvoices, loadArtisanQuotes } from "./pro-documents";
import { loadExpenses } from "./pro-expenses";
import { loadInbox } from "./pro-requests";
import { writePreloadedScreen } from "./screen-cache";

/** Onglets chargés d'avance, avec la clé de leur écran (`useFocusData`). */
const TABS: [key: string, load: () => Promise<unknown>][] = [
  ["tab:demandes", loadInbox],
  ["tab:chantiers", loadArtisanChantiers],
  ["tab:devis", loadArtisanQuotes],
  ["tab:factures", loadArtisanInvoices],
  ["tab:depenses", loadExpenses],
  ["tab:messages", loadConversations],
];

/**
 * Préchargement de l'espace artisan (ADR 0192) : pendant que l'accueil s'affiche, les autres
 * onglets se chargent en arrière-plan ; les ouvrir est alors instantané. Une erreur laisse
 * simplement l'onglet charger ses données à l'ouverture.
 */
export function preloadArtisanTabs(): void {
  for (const [key, load] of TABS) {
    load()
      .then((value) => {
        if (value !== null) writePreloadedScreen(key, value);
      })
      .catch(() => undefined);
  }
}
