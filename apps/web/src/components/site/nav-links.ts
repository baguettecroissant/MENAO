import { fr } from "@/i18n/fr";

/**
 * Liens de navigation du site (maquettes : Comment ça marche ?, Garanties & Confiance, Espace Pro),
 * précédés de la page carrefour des métiers (décision du plan du site, 9 novembre 2026).
 */
export const NAV_LINKS = [
  { href: "/metiers", label: fr.nav.trades },
  { href: "/comment-ca-marche", label: fr.nav.howItWorks },
  { href: "/garanties", label: fr.nav.guarantees },
  { href: "/pro", label: fr.nav.pro },
] as const;
