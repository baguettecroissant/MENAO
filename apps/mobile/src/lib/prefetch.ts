import { conversationScreenKey, loadConversation } from "./messages";
import { chantierScreenKey, loadArtisanChantierScreen } from "./pro-chantiers";
import { expenseScreenKey, loadExpenseView } from "./pro-expenses";
import { loadOpportunity, opportunityScreenKey } from "./pro-requests";
import { prefetchScreen, setScreenPreview } from "./screen-cache";

/**
 * Ouverture instantanée des fiches (ADR 0193) : au toucher d'une ligne (avant même que le doigt
 * se relève), ou pour les premières lignes d'une liste, la fiche se charge d'avance ; son titre,
 * connu de la liste, s'affiche aussitôt si elle n'est pas encore prête. Lectures seules.
 */

export function prefetchOpportunity(id: string, title: string, subtitle?: string | null): void {
  setScreenPreview(opportunityScreenKey(id), { title, subtitle });
  prefetchScreen(opportunityScreenKey(id), () => loadOpportunity(id));
}

export function prefetchChantier(id: string, title: string, subtitle?: string | null): void {
  setScreenPreview(chantierScreenKey(id), { title, subtitle });
  prefetchScreen(chantierScreenKey(id), () => loadArtisanChantierScreen(id));
}

export function prefetchExpense(id: string, title: string, subtitle?: string | null): void {
  setScreenPreview(expenseScreenKey(id), { title, subtitle });
  prefetchScreen(expenseScreenKey(id), () => loadExpenseView(id));
}

export function prefetchConversation(id: string, artisan: boolean, name: string): void {
  setScreenPreview(conversationScreenKey(id), { title: name });
  prefetchScreen(conversationScreenKey(id), () => loadConversation(id, artisan));
}

/** Premières lignes d'une liste chargées d'avance, une fois la liste affichée et au calme. */
export const PREFETCH_FIRST = 3;
export const PREFETCH_DELAY_MS = 1200;
