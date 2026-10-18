/**
 * Retour dans l'application après une page hébergée (signature DocuSeal, paiement Stripe). Les
 * fonctions serveur renvoient vers une page publique du site, qui rouvre l'application sur l'écran
 * d'origine. Seuls des écrans et des états connus sont acceptés, avec un identifiant au format
 * UUID : aucune redirection libre. ADR 0060.
 */
export const APP_SCHEME = "menao";
export const APP_RETURN_PATH = "/retour-application";

/** Devis et chantier (particulier) ; compte de paiement Stripe de l'artisan (ADR 0124). */
export const APP_RETURN_SCREENS = ["devis", "chantier", "paiements"] as const;
export type AppReturnScreen = (typeof APP_RETURN_SCREENS)[number];

/**
 * Fin de la signature du devis ou du PV, paiement terminé, paiement abandonné ; fin de
 * l'inscription Stripe de l'artisan, ou lien Stripe expiré (ADR 0124).
 */
export const APP_RETURN_STATES = [
  "signature",
  "reception",
  "paiement",
  "annule",
  "connect",
  "connect_expire",
] as const;
export type AppReturnState = (typeof APP_RETURN_STATES)[number];

export type AppReturn = { screen: AppReturnScreen; id: string; state: AppReturnState };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const isOneOf = <T extends string>(list: readonly T[], value: string | null): value is T =>
  value !== null && (list as readonly string[]).includes(value);

/** Adresse de la page de retour du site, donnée au prestataire comme adresse de fin. */
export function appReturnUrl(origin: string, target: AppReturn): string {
  const params = new URLSearchParams({ ecran: target.screen, id: target.id, etat: target.state });
  return `${origin.replace(/\/+$/, "")}${APP_RETURN_PATH}?${params}`;
}

/** Paramètres de la page de retour, validés ; null s'ils sont incomplets ou inconnus. */
export function parseAppReturn(params: { get(name: string): string | null }): AppReturn | null {
  const screen = params.get("ecran");
  const id = params.get("id");
  const state = params.get("etat");
  if (!isOneOf(APP_RETURN_SCREENS, screen) || !isOneOf(APP_RETURN_STATES, state)) return null;
  if (id === null || !UUID.test(id)) return null;
  return { screen, id, state };
}

/** Lien qui rouvre l'application sur l'écran d'origine (`menao://devis/<id>?retour=paiement`). */
export function appDeepLink(target: AppReturn): string {
  return `${APP_SCHEME}://${target.screen}/${target.id}?retour=${target.state}`;
}

/** Page équivalente du site, pour qui a ouvert le lien hors de l'application. */
export function appReturnSitePath(target: AppReturn): string {
  if (target.screen === "paiements") {
    return `/pro/onboarding/paiements?${target.state === "connect" ? "retour=1" : "lien=expire"}`;
  }
  if (target.screen === "devis") {
    const base = `/mon-espace/devis/${target.id}`;
    if (target.state === "signature") return `${base}?signature=terminee`;
    if (target.state === "paiement") return `${base}?paiement=termine`;
    return base;
  }
  const base = `/mon-espace/chantiers/${target.id}`;
  if (target.state === "reception") return `${base}?reception=signee`;
  if (target.state === "paiement") return `${base}?paiement=termine`;
  return base;
}
