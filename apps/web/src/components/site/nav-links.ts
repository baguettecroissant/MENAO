import { fr } from "@/i18n/fr";

/**
 * Liens du centre de l'en-tête : la page carrefour des métiers (plan du site, 9 novembre 2026),
 * « Comment ça marche ? » et « Garanties ». L'Espace Pro n'est plus un lien du centre : il a son
 * propre bouton, à droite (F-182, ADR 0379).
 */
export const NAV_LINKS = [
  { href: "/metiers", label: fr.nav.trades },
  { href: "/comment-ca-marche", label: fr.nav.howItWorks },
  { href: "/garanties", label: fr.nav.guaranteesShort },
] as const;

/** Pages de l'Espace Pro : le bouton des artisans y est marqué comme page en cours. */
export function isProPath(pathname: string | null): boolean {
  return pathname === "/pro" || (pathname?.startsWith("/pro/") ?? false);
}
