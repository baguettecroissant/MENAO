import { fr } from "@/i18n/fr";

/** Liens de navigation du site (maquettes : Comment ça marche ?, Garanties & Confiance, Espace Pro). */
export const NAV_LINKS = [
  { href: "/comment-ca-marche", label: fr.nav.howItWorks },
  { href: "/garanties", label: fr.nav.guarantees },
  { href: "/pro", label: fr.nav.pro },
] as const;
