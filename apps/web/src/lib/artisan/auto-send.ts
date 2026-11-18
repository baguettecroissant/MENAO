import "server-only";
import { getOnboardingContext } from "./context";

/**
 * Inscription progressive (ADR 0376) : le dossier part à l'équipe dès qu'il peut partir, sans
 * bouton « Envoyer ». La base refait le contrôle et refuse un dossier incomplet (erreur ignorée
 * ici). Après une demande de compléments ou un refus, l'artisan renvoie lui-même son dossier.
 */
export async function sendWhenReady(): Promise<void> {
  const { supabase, artisan } = await getOnboardingContext();
  if (artisan.status !== "brouillon" || artisan.refusal_reason !== null) return;
  await supabase.rpc("submit_artisan_onboarding");
}
