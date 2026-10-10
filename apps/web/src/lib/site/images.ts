/**
 * Photos d'illustration générées par IA, personnes fictives (voir docs/images/photos-generees.md).
 * WebP précompressés servis depuis public/images, sans optimisation Vercel. Un métier sans
 * photo conserve son visuel de remplacement aux couleurs MENAO.
 */
export const HERO_IMAGE: string | null = "/images/accueil-bandeau.webp";

export const TRADE_IMAGES: Partial<Record<string, string>> = {
  electricien: "/images/metiers/electricien.webp",
  plombier: "/images/metiers/plombier.webp",
  chauffagiste: "/images/metiers/chauffagiste.webp",
  climaticien: "/images/metiers/climaticien.webp",
  macon: "/images/metiers/macon.webp",
  peintre: "/images/metiers/peintre.webp",
  plaquiste: "/images/metiers/plaquiste.webp",
  carreleur: "/images/metiers/carreleur.webp",
  menuisier: "/images/metiers/menuisier.webp",
  charpentier: "/images/metiers/charpentier.webp",
  couvreur: "/images/metiers/couvreur.webp",
  facadier: "/images/metiers/facadier.webp",
  serrurier: "/images/metiers/serrurier.webp",
  terrassier: "/images/metiers/terrassier.webp",
  paysagiste: "/images/metiers/paysagiste.webp",
};
