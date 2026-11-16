/**
 * Carte de France de la zone d'intervention (F-162, ADR 0349) : les contours simplifiés de l'IGN
 * sont projetés à plat par `scripts/contours-france.py` ; un point (le siège de l'artisan) se place
 * avec la même projection.
 */
export type FranceMapProjection = { lon0: number; lat1: number; k: number; echelle: number };

export type FranceMapData = {
  largeur: number;
  hauteur: number;
  projection: FranceMapProjection;
  zones: Record<string, { nom: string; d: string }>;
};

/** Position d'un point (longitude, latitude) sur la carte, ou null s'il tombe en dehors. */
export function franceMapPoint(
  projection: FranceMapProjection,
  lon: number,
  lat: number,
  size: { largeur: number; hauteur: number },
): { x: number; y: number } | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const x = Math.round((lon - projection.lon0) * projection.k * projection.echelle * 10) / 10;
  const y = Math.round((projection.lat1 - lat) * projection.echelle * 10) / 10;
  return x < 0 || y < 0 || x > size.largeur || y > size.hauteur ? null : { x, y };
}
