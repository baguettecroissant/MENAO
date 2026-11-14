// Lecture haute définition des photos de plans (F-159, ADR 0325). Un plan d'exécution entier tient
// mal dans une image de 2 400 px : ses cotes ne font que quelques pixels. La photo est donc gardée
// en grand, envoyée en vue d'ensemble, puis découpée en zones qui se chevauchent, chacune lue à la
// pleine résolution du modèle. Ce fichier ne fait que la géométrie ; le navigateur découpe.
// Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

/** Plus grand côté de la vue d'ensemble et d'une zone envoyées au modèle, en pixels. */
export const PLAN_VIEW_SIDE = 2400;
/** Plus grand côté gardé de la photo d'origine avant découpage. */
export const PLAN_SOURCE_SIDE = 6400;
/** En dessous, la vue d'ensemble suffit : pas de zones. */
export const PLAN_TILE_THRESHOLD = 2600;
export const MAX_TILES_PER_PLAN = 6;
/** Zones au plus par lecture, tous plans confondus (taille de la requête, durée, coût). */
export const MAX_TILES_PER_READING = 24;
/** Recouvrement entre deux zones voisines, en part de la zone : une cote coupée reste lisible. */
const OVERLAP = 0.12;

export type PlanTile = {
  /** Position dans la grille, à partir de 1. */
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** Rectangle dans la photo d'origine, en pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Grilles essayées, de la plus légère à la plus fine (colonnes, lignes) pour un plan en largeur. */
const GRIDS: readonly (readonly [number, number])[] = [
  [2, 1],
  [2, 2],
  [3, 2],
];

/** Côté d'une zone quand `total` pixels sont partagés en `n` zones qui se chevauchent. */
const tileSide = (total: number, n: number) =>
  n === 1 ? total : Math.ceil(total / (n - (n - 1) * OVERLAP));

/**
 * Zones d'une photo de `width` × `height` pixels : aucune si la vue d'ensemble suffit, sinon la
 * grille la plus légère dont chaque zone tient dans la résolution du modèle (au plus 6 zones ; un
 * plan plus grand garde 6 zones, réduites à l'envoi).
 */
export function planTileGrid(width: number, height: number): PlanTile[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return [];
  if (Math.max(width, height) <= PLAN_TILE_THRESHOLD) return [];
  const landscape = width >= height;
  const fits = GRIDS.map(([a, b]) => (landscape ? ([a, b] as const) : ([b, a] as const))).find(
    ([cols, rows]) =>
      tileSide(width, cols) <= PLAN_VIEW_SIDE && tileSide(height, rows) <= PLAN_VIEW_SIDE,
  );
  const [cols, rows] = fits ?? (landscape ? ([3, 2] as const) : ([2, 3] as const));
  const w = Math.min(width, tileSide(width, cols));
  const h = Math.min(height, tileSide(height, rows));
  const tiles: PlanTile[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      tiles.push({
        col,
        row,
        cols,
        rows,
        x: cols === 1 ? 0 : Math.round(((col - 1) * (width - w)) / (cols - 1)),
        y: rows === 1 ? 0 : Math.round(((row - 1) * (height - h)) / (rows - 1)),
        w,
        h,
      });
    }
  }
  return tiles;
}

/** Échelle à appliquer à une photo pour que son plus grand côté ne dépasse pas `maxSide`. */
export function planScale(width: number, height: number, maxSide: number): number {
  return Math.min(1, maxSide / Math.max(width, height, 1));
}

/** Nom d'une zone pour le modèle : « zone 2 sur 6 (ligne 1 sur 2, colonne 2 sur 3) ». */
export function planTileLabel(t: Pick<PlanTile, "col" | "row" | "cols" | "rows">): string {
  return `zone ${(t.row - 1) * t.cols + t.col} sur ${t.cols * t.rows} (ligne ${t.row} sur ${t.rows}, colonne ${t.col} sur ${t.cols})`;
}
