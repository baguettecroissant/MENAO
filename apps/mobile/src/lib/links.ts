import type { Href } from "expo-router";

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

/** Pages de l'espace client du site qui ont leur écran dans l'application. */
const ROUTES: readonly [RegExp, (id: string) => Href][] = [
  [/^\/mon-espace$/, () => "/chantiers"],
  [new RegExp(`^/mon-espace/chantiers/${UUID}$`), (id) => `/chantier/${id}`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/reception$`), (id) => `/chantier/${id}/reception`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/solde$`), (id) => `/chantier/${id}/solde`],
  [new RegExp(`^/mon-espace/chantiers/${UUID}/avis$`), (id) => `/chantier/${id}/avis`],
  [new RegExp(`^/mon-espace/devis/${UUID}$`), (id) => `/devis/${id}`],
  [new RegExp(`^/mon-espace/devis/${UUID}/acompte$`), (id) => `/devis/${id}/acompte`],
  [/^\/mon-espace\/messages$/, () => "/messages"],
  [new RegExp(`^/mon-espace/messages/${UUID}$`), (id) => `/conversation/${id}`],
  [/^\/notifications$/, () => "/notifications"],
  [new RegExp(`^/signalements/${UUID}$`), (id) => `/signalement/${id}`],
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
