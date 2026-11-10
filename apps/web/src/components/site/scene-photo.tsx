import { fr } from "@/i18n/fr";

/**
 * Photos de scènes du site (ADR 0271) : Julien, artisan, et Camille, cliente, deux personnages
 * fictifs générés par IA, avec les vrais écrans de l'application dans leurs téléphones. WebP
 * précompressés dans public/images/scenes (1 600, 960 et 640 px), sans optimisation Vercel.
 */
const FILES = {
  julienPortrait: "julien-portrait",
  julienVan: "julien-camionnette",
  meeting: "rendez-vous",
  handover: "reception-chantier",
  camilleProject: "camille-projet",
  camilleArtisans: "camille-artisans",
  camilleQuote: "camille-devis",
  camilleFollow: "camille-suivi",
  camillePortrait: "camille-portrait",
} as const;

export type SceneKey = keyof typeof FILES;

export function ScenePhoto({
  scene,
  sizes,
  position = "50% 50%",
  className = "",
  priority = false,
}: {
  scene: SceneKey;
  /** Largeur affichée, pour que le navigateur choisisse la bonne taille (attribut `sizes`). */
  sizes: string;
  /** Cadrage quand l'image est recadrée (object-position). */
  position?: string;
  className?: string;
  priority?: boolean;
}) {
  const base = `/images/scenes/${FILES[scene]}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
    <img
      src={`${base}.webp`}
      srcSet={`${base}-640.webp 640w, ${base}-960.webp 960w, ${base}.webp 1600w`}
      sizes={sizes}
      alt={fr.site.scenes[scene]}
      width={1600}
      height={1067}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block object-cover ${className}`}
      style={{ objectPosition: position }}
    />
  );
}
