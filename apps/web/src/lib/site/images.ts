/**
 * Photos d'illustration générées par IA, personnes fictives (voir docs/images/photos-generees.md),
 * à remplacer par de vraies photos avec apps/web/scripts/photos-reelles.mjs (docs/images/photos-reelles.md).
 * WebP précompressés servis depuis public/images, sans optimisation Vercel. Un métier sans
 * photo conserve son visuel de remplacement aux couleurs MENAO.
 */
export const HERO_IMAGE: string | null = "/images/accueil-bandeau.webp";

/**
 * Versions réduites (même cadrage) générées par photos-reelles.mjs : le navigateur choisit selon
 * la taille d'affichage (srcset), pour alléger les petits écrans et les vignettes (ADR 0103).
 */
export const HERO_SRCSET = HERO_IMAGE
  ? `${HERO_IMAGE.replace(/\.webp$/, "-960.webp")} 960w, ${HERO_IMAGE} 1536w`
  : undefined;

export function tradeSrcSet(code: string): string | undefined {
  const image = TRADE_IMAGES[code];
  return image ? `${image.replace(/\.webp$/, "-400.webp")} 400w, ${image} 800w` : undefined;
}

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

/**
 * Image de partage (Open Graph, 1200 × 630) : une par métier pour les pages métier et ville, sinon
 * celle de MENAO. Fichiers statiques dans public/images/og (ADR 0094).
 */
export function shareImage(tradeCode?: string) {
  const file = tradeCode && TRADE_IMAGES[tradeCode] ? tradeCode : "menao";
  return { url: `/images/og/${file}.jpg`, width: 1200, height: 630, alt: "MENAO" };
}

/** Couverture d'un guide (ADR 0149) : WebP 1 536 × 1 024 et versions réduites, même cadrage. */
export function guideCover(slug: string) {
  const src = `/images/guides/${slug}.webp`;
  const size = (w: number) => src.replace(/\.webp$/, `-${w}.webp`);
  return {
    src,
    srcSet: `${size(640)} 640w, ${size(960)} 960w, ${src} 1536w`,
    width: 1536,
    height: 1024,
  };
}

/** Image de partage d'un guide (1200 × 630), recadrée dans sa couverture. */
export function guideShareImage(slug: string, alt: string) {
  return { url: `/images/og/guides/${slug}.jpg`, width: 1200, height: 630, alt };
}
