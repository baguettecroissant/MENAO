/**
 * Dessins de la gamification (F-24, ADR 0096), décrits une seule fois et rendus par le site (SVG)
 * et par l'application (react-native-svg) : badges en hexagone à liseré métallique (maquettes
 * « Mon grade Menao ») et illustration de l'ensemble de chantier, en attendant sa vraie photo.
 */

/** Cadre commun des badges : 100 × 100, hexagone pointe en haut. */
export const BADGE_VIEWBOX = 100;
/** Hexagone extérieur (liseré). */
export const BADGE_RING = "M50 3 93 27v46L50 97 7 73V27Z";
/** Hexagone intérieur, réduit de 20 % autour du centre. */
export const BADGE_FACE = "M50 12.4 84.4 31.6v36.8L50 87.6 15.6 68.4V31.6Z";
/** Reflet de l'hexagone intérieur, en dégradé du haut (opacité `shine`) vers le milieu (nulle). */
export const BADGE_SHINE = "M50 12.4 84.4 31.6V50H15.6V31.6Z";

export type BadgeStyle = {
  /** Dégradé du liseré, du haut vers le bas. */
  ring: readonly [string, string];
  /** Dégradé de l'hexagone intérieur, du haut vers le bas. */
  face: readonly [string, string];
  /** Trait de l'icône, et son remplissage translucide (effet de volume). */
  icon: string;
  iconFill: string;
  /** Opacité du reflet en haut de l'hexagone intérieur. */
  shine: number;
};

/**
 * Teintes des badges : bleu à liseré argenté une fois obtenu (maquettes), or pour « Main d'or »,
 * gris tant qu'il est à obtenir.
 */
export const BADGE_STYLES = {
  obtenu: {
    ring: ["#f4f6fc", "#a9b6dc"],
    face: ["#6f8cfb", "#3451d1"],
    icon: "#ffffff",
    iconFill: "rgba(255, 255, 255, 0.28)",
    shine: 0.22,
  },
  or: {
    ring: ["#fff3c4", "#c9902a"],
    face: ["#6f8cfb", "#3451d1"],
    icon: "#ffd665",
    iconFill: "rgba(255, 255, 255, 0.16)",
    shine: 0.22,
  },
  a_obtenir: {
    ring: ["#f6f7f9", "#d3d8e2"],
    face: ["#eceef3", "#d5d9e2"],
    icon: "#8b93a7",
    iconFill: "rgba(139, 147, 167, 0.12)",
    shine: 0.6,
  },
} satisfies Record<string, BadgeStyle>;

export type BadgeStyleName = keyof typeof BADGE_STYLES;

/** Teinte d'un badge selon son code et son obtention. */
export function badgeStyle(code: string, unlocked: boolean): BadgeStyleName {
  if (!unlocked) return "a_obtenir";
  return code === "main_d_or" ? "or" : "obtenu";
}

/** Forme colorée d'une illustration (couleurs fixes : c'est un produit, pas un élément du thème). */
export type ArtShape = { d: string; fill?: string; stroke?: string; strokeWidth?: number };

const FABRIC = "#2f45b5";
const FABRIC_DARK = "#24379a";
const FABRIC_LIGHT = "#4a63dc";

/**
 * Ensemble de chantier MENAO (récompense du niveau 5) : veste et pantalon bleus, logo brodé
 * blanc sur la poitrine. Illustration indicative, à remplacer par une photo quand la tenue existera.
 */
export const OUTFIT_VIEWBOX = { width: 100, height: 142 } as const;
export const OUTFIT: readonly ArtShape[] = [
  // Ombre au sol.
  { d: "M28 138a22 2.6 0 1 0 44 0a22 2.6 0 1 0-44 0Z", fill: "rgba(17, 23, 40, 0.1)" },
  // Pantalon : jambes, ceinture, poches cargo, ourlets.
  { d: "M28 70h44l2.5 62H54.5L50 88l-4.5 44H25.5Z", fill: FABRIC },
  { d: "M50 70v18", stroke: FABRIC_DARK, strokeWidth: 1.2 },
  { d: "M28 64h44v6H28Z", fill: FABRIC_DARK },
  { d: "M29 92h9v14h-9ZM62 92h9v14h-9Z", fill: FABRIC_DARK },
  { d: "M29 95h9M62 95h9", stroke: FABRIC_LIGHT, strokeWidth: 1 },
  { d: "M25.6 127h20.3l-.4 5H25.5ZM54.1 127h20.3l.2 5H54.5Z", fill: FABRIC_LIGHT },
  // Veste : manches (plus sombres), corps, col, fermeture, poche, poignets.
  { d: "M28 13 17 22l-6 32 9 2 6-24Z", fill: FABRIC_DARK },
  { d: "M72 13l11 9 6 32-9 2-6-24Z", fill: FABRIC_DARK },
  { d: "M40 9 28 13l-2 19 1 30h46l1-30-2-19-12-4c-3 4-17 4-20 0Z", fill: FABRIC },
  { d: "M40 9l6 11-8-3ZM60 9l-6 11 8-3Z", fill: FABRIC_LIGHT },
  { d: "M50 19v43", stroke: "#a9b8ff", strokeWidth: 1.4 },
  { d: "M32 30h12v10H32Z", fill: FABRIC_DARK },
  { d: "M32 33h12", stroke: FABRIC_LIGHT, strokeWidth: 1 },
  { d: "M11 54l9 2-.6 3-9-2ZM89 54l-9 2 .6 3 9-2Z", fill: FABRIC_LIGHT },
  { d: "M27 58h46v4H27Z", fill: FABRIC_DARK },
  // Logo MENAO brodé (toit et sourire du logo, en blanc).
  {
    d: "M57.6 32.6 60 30.8l2.4 1.8",
    stroke: "#ffffff",
    strokeWidth: 1.3,
  },
  { d: "M55.9 35.1c2.2 2.7 6 2.7 8.2 0", stroke: "#ffffff", strokeWidth: 1.7 },
];
