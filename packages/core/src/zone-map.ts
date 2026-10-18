/**
 * Aperçu cartographique de la zone d'intervention (ADR 0126) : tuiles Web Mercator de 256 px
 * (Plan IGN) posées autour de l'adresse de départ, au zoom qui fait occuper au cercle du rayon
 * 80 % du petit côté du cadre. Le zoom des tuiles est entier ; l'écart est rattrapé en agrandissant
 * ou en réduisant les tuiles (entre 0,71 et 1,41 fois), si bien que le cercle reste à l'échelle.
 */

const TILE_PX = 256;
/** Circonférence équatoriale de la Terre (m), celle de la projection Web Mercator. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const MAX_ZOOM = 18;

/** Part du petit côté du cadre occupée par le cercle. */
export const ZONE_MAP_FILL = 0.8;

export type ZoneMapTile = {
  z: number;
  x: number;
  y: number;
  /** Position et taille dans le cadre, en pixels entiers (sans interstice entre tuiles). */
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ZoneMapView = {
  zoom: number;
  /** Diamètre du cercle du rayon, en pixels, centré dans le cadre. */
  circle: number;
  tiles: ZoneMapTile[];
};

export function zoneMapView({
  lon,
  lat,
  radiusKm,
  width,
  height,
}: {
  lon: number;
  lat: number;
  radiusKm: number;
  width: number;
  height: number;
}): ZoneMapView {
  const diameter = ZONE_MAP_FILL * Math.min(width, height);
  if (!(diameter > 0) || !(radiusKm > 0)) return { zoom: 0, circle: 0, tiles: [] };

  const latRad = (lat * Math.PI) / 180;
  // Mètres par pixel au zoom 0, à cette latitude.
  const metersPerPx0 = (EARTH_CIRCUMFERENCE_M * Math.cos(latRad)) / TILE_PX;
  const exactZoom = Math.log2((metersPerPx0 * diameter) / (2 * radiusKm * 1000));
  const zoom = Math.min(MAX_ZOOM, Math.max(0, Math.round(exactZoom)));
  const tileSize = TILE_PX * 2 ** (exactZoom - zoom);
  const n = 2 ** zoom;

  // Position de l'adresse, en tuiles du zoom entier.
  const cx = ((lon + 180) / 360) * n;
  const cy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const edgeX = (tx: number) => Math.round((tx - cx) * tileSize + width / 2);
  const edgeY = (ty: number) => Math.round((ty - cy) * tileSize + height / 2);

  const tiles: ZoneMapTile[] = [];
  for (let ty = Math.floor(cy - height / 2 / tileSize); ty < cy + height / 2 / tileSize; ty++) {
    if (ty < 0 || ty >= n) continue;
    const top = edgeY(ty);
    for (let tx = Math.floor(cx - width / 2 / tileSize); tx < cx + width / 2 / tileSize; tx++) {
      const left = edgeX(tx);
      tiles.push({
        z: zoom,
        x: ((tx % n) + n) % n,
        y: ty,
        left,
        top,
        width: edgeX(tx + 1) - left,
        height: edgeY(ty + 1) - top,
      });
    }
  }
  return { zoom, circle: Math.round(diameter), tiles };
}
