import { APP_RETURN_STATES, APP_SCHEME, type AppReturnState } from "@menao/core";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

/** Fin d'une page hébergée : état transmis par la page de retour du site, ou fenêtre fermée. */
export type HostedResult = AppReturnState | "fermee";

const isState = (value: unknown): value is AppReturnState =>
  typeof value === "string" && (APP_RETURN_STATES as readonly string[]).includes(value);

/**
 * Signature DocuSeal ou paiement Stripe dans la fenêtre sécurisée du téléphone (ADR 0060). Elle se
 * ferme d'elle-même quand la page de retour du site rouvre l'application (`menao://…`). Session
 * éphémère : aucun cookie partagé avec le navigateur, ni demande de connexion du système.
 */
export async function openHostedPage(url: string): Promise<HostedResult> {
  const result = await WebBrowser.openAuthSessionAsync(url, `${APP_SCHEME}://`, {
    preferEphemeralSession: true,
  });
  if (result.type !== "success") return "fermee";
  const state = Linking.parse(result.url).queryParams?.retour;
  return isState(state) ? state : "fermee";
}
