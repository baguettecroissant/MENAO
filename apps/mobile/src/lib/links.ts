import type { Href } from "expo-router";

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

/** Pages des espaces client et artisan du site qui ont leur écran dans l'application. */
const ROUTES: readonly [RegExp, (id: string) => Href][] = [
  [/^\/mon-espace$/, () => "/chantiers"],
  [new RegExp(`^/mon-espace/chantiers/${UUID}$`), (id) => `/chantier/${id}`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/reception$`), (id) => `/chantier/${id}/reception`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/solde$`), (id) => `/chantier/${id}/solde`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/avis$`), (id) => `/chantier/${id}/avis`],
  [new RegExp(`^/mon-espace/devis/${UUID}$`), (id) => `/devis/${id}`],
  [new RegExp(`^/mon-espace/devis/${UUID}/acompte$`), (id) => `/devis/${id}/acompte`],
  [/^\/mon-espace\/messages$/, () => "/messages"],
  [/^\/mon-espace\/documents$/, () => "/documents"],
  [/^\/compte$/, () => "/compte"],
  [new RegExp(`^/mon-espace/messages/${UUID}$`), (id) => `/conversation/${id}`],
  [/^\/notifications$/, () => "/notifications"],
  [new RegExp(`^/signalements/${UUID}$`), (id) => `/signalement/${id}`],
  // Espace artisan (règle 10 : jamais de renvoi vers le site).
  [/^\/pro\/tableau-de-bord$/, () => "/pro"],
  // Dossier (« Faire vérifier mon entreprise », ADR 0113) : l'accueil de l'espace pro.
  [/^\/pro\/onboarding$/, () => "/pro"],
  // Documents (relances avant échéance) et fiche de l'artisan (ADR 0123).
  [/^\/pro\/onboarding\/documents$/, () => "/pro-documents"],
  [/^\/pro\/onboarding\/profil$/, () => "/pro-profil-public"],
  [/^\/pro\/onboarding\/paiements$/, () => "/pro-paiements"],
  [/^\/pro\/bienvenue$/, () => "/pro-bienvenue"],
  [/^\/pro\/demandes$/, () => "/pro-demandes"],
  [new RegExp(`^/pro/demandes/${UUID}$`), (id) => `/opportunite/${id}`],
  [/^\/pro\/chantiers$/, () => "/pro/chantiers"],
  [new RegExp(`^/pro/chantiers/${UUID}$`), (id) => `/pro-chantier/${id}`],
  [new RegExp(`^/pro/chantiers/${UUID}/devis$`), (id) => `/pro-chantier/${id}/devis`],
  [/^\/pro\/devis$/, () => "/pro/devis"],
  [/^\/pro\/factures$/, () => "/pro-factures"],
  [/^\/pro\/avis$/, () => "/pro-avis"],
  [/^\/pro\/grade$/, () => "/pro-grade"],
  [/^\/pro\/agenda$/, () => "/pro-agenda"],
  [/^\/pro\/agenda\/disponibilites$/, () => "/pro-disponibilites"],
  [/^\/pro\/messages$/, () => "/pro/messages"],
  [new RegExp(`^/pro/messages/${UUID}$`), (id) => `/conversation/${id}`],
];

/**
 * Écran de l'application pour un lien vers le site (bouton d'une notification, comme dans
 * l'e-mail). null si la page n'a pas encore d'écran dans l'application : elle s'ouvre alors sur
 * le site.
 */
export function appRouteForSitePath(link: string): Href | null {
  const path = link.split(/[?#]/)[0]?.replace(/\/+$/, "") || "/";
  for (const [pattern, route] of ROUTES) {
    const match = pattern.exec(path);
    if (match) return route(match[1] ?? "");
  }
  return null;
}
