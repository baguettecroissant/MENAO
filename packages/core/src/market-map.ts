/**
 * Carte du marché du back-office (F-50, ADR 0181) : calculs de la carte (Plan IGN, projection
 * Web Mercator, déplacement et zoom), état des artisans à une date (« Voir grandir ») et entonnoir
 * recherches → résultats → demandes par métier et par commune. La couverture par les artisans
 * validés vient de la base (admin_market, ADR 0214). Sans dépendance, comme l'aperçu de zone
 * (zone-map.ts).
 */

const TILE_PX = 256;
export const MARKET_MIN_ZOOM = 5;
export const MARKET_MAX_ZOOM = 16;

export type MapView = { lon: number; lat: number; zoom: number };
export type MapTile = { z: number; x: number; y: number; left: number; top: number };

/** Position en pixels du monde (Web Mercator) au zoom donné. */
function worldPixel(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const size = TILE_PX * 2 ** zoom;
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * size,
  };
}

function worldToLonLat(x: number, y: number, zoom: number): { lon: number; lat: number } {
  const size = TILE_PX * 2 ** zoom;
  const lon = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lon, lat };
}

/** Position d'un point dans le cadre de la carte (pixels depuis le coin haut gauche). */
export function projectPoint(
  view: MapView,
  width: number,
  height: number,
  lon: number,
  lat: number,
): { x: number; y: number } {
  const center = worldPixel(view.lon, view.lat, view.zoom);
  const point = worldPixel(lon, lat, view.zoom);
  return { x: point.x - center.x + width / 2, y: point.y - center.y + height / 2 };
}

/** Tuiles qui couvrent le cadre de la carte. */
export function visibleTiles(view: MapView, width: number, height: number): MapTile[] {
  if (!(width > 0) || !(height > 0)) return [];
  const center = worldPixel(view.lon, view.lat, view.zoom);
  const n = 2 ** view.zoom;
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const tiles: MapTile[] = [];
  for (let ty = Math.floor(top / TILE_PX); ty * TILE_PX < top + height; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE_PX); tx * TILE_PX < left + width; tx++) {
      tiles.push({
        z: view.zoom,
        x: ((tx % n) + n) % n,
        y: ty,
        left: Math.round(tx * TILE_PX - left),
        top: Math.round(ty * TILE_PX - top),
      });
    }
  }
  return tiles;
}

/** Carte déplacée de (dx, dy) pixels (glisser vers la droite montre l'ouest). */
export function panView(view: MapView, dx: number, dy: number): MapView {
  const center = worldPixel(view.lon, view.lat, view.zoom);
  const { lon, lat } = worldToLonLat(center.x - dx, center.y - dy, view.zoom);
  return { lon: Math.max(-180, Math.min(180, lon)), lat, zoom: view.zoom };
}

/** Zoom d'un cran (+1 ou -1) en gardant immobile le point sous le curseur (px, py). */
export function zoomView(
  view: MapView,
  delta: number,
  width: number,
  height: number,
  px = width / 2,
  py = height / 2,
): MapView {
  const zoom = Math.max(MARKET_MIN_ZOOM, Math.min(MARKET_MAX_ZOOM, view.zoom + Math.sign(delta)));
  if (zoom === view.zoom) return view;
  const center = worldPixel(view.lon, view.lat, view.zoom);
  const anchor = worldToLonLat(center.x + px - width / 2, center.y + py - height / 2, view.zoom);
  const anchorAfter = worldPixel(anchor.lon, anchor.lat, zoom);
  const { lon, lat } = worldToLonLat(
    anchorAfter.x - (px - width / 2),
    anchorAfter.y - (py - height / 2),
    zoom,
  );
  return { lon, lat, zoom };
}

/** Cadrage qui montre tous les points avec une marge ; la Côte d'Azur s'il n'y en a aucun. */
export function fitView(
  points: readonly { lon: number; lat: number }[],
  width: number,
  height: number,
  padding = 48,
): MapView {
  if (points.length === 0) return { lon: 7.15, lat: 43.75, zoom: 9 };
  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const lon = (west + east) / 2;
  const middle = worldToLonLat(
    (worldPixel(west, north, 0).x + worldPixel(east, south, 0).x) / 2,
    (worldPixel(west, north, 0).y + worldPixel(east, south, 0).y) / 2,
    0,
  );
  let zoom = Math.min(MARKET_MAX_ZOOM - 3, 13);
  while (zoom > MARKET_MIN_ZOOM) {
    const nw = worldPixel(west, north, zoom);
    const se = worldPixel(east, south, zoom);
    if (se.x - nw.x <= width - 2 * padding && se.y - nw.y <= height - 2 * padding) break;
    zoom -= 1;
  }
  return { lon, lat: middle.lat, zoom };
}

/** Rayon d'une zone d'intervention en pixels, à cette latitude et à ce zoom. */
export function kmToPixels(km: number, lat: number, zoom: number): number {
  const metersPerPixel = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (TILE_PX * 2 ** zoom);
  return (km * 1000) / metersPerPixel;
}

// ---------------------------------------------------------------------------------------------
// Données du marché (admin_market)
// ---------------------------------------------------------------------------------------------

export type MarketArtisan = {
  id: string;
  nom: string | null;
  statut: string;
  metiers: string[];
  lon: number | null;
  lat: number | null;
  rayon_km: number | null;
  /** Communes ou territoires de la zone, vide pour un rayon. */
  zone_labels: string[];
  commune: string | null;
  inscrit_le: string;
  valide_le: string | null;
};

export type MarketDemand = {
  code_insee: string;
  ville: string | null;
  metier: string | null;
  lon: number | null;
  lat: number | null;
  recherches: number;
  resultats: number;
  demandes: number;
  /** Artisans validés du métier qui couvrent la commune, quel que soit leur mode de zone. */
  couverture: number;
  /** Parmi eux, ceux qui couvrent une région ou la France (après les locaux au classement). */
  couverture_large: number;
};

/** Demande d'une commune, sans la couverture : elle dépend du métier et ne s'additionne pas. */
export type MarketCommune = Omit<MarketDemand, "couverture" | "couverture_large"> & {
  metiers: string[];
};

/** Étape d'un artisan sur la carte : validé, suspendu, en cours d'inscription, refusé. */
export type MarketStage = "valide" | "suspendu" | "en_cours" | "refuse";
export const MARKET_STAGES: readonly MarketStage[] = ["valide", "en_cours", "suspendu", "refuse"];

/**
 * Étape d'un artisan à une date (« Voir grandir ») : pas encore inscrit (null), en cours
 * d'inscription, puis validé à la date de sa première validation. À aujourd'hui, son statut actuel.
 */
export function stageAt(artisan: MarketArtisan, at: Date | null = null): MarketStage | null {
  if (at && new Date(artisan.inscrit_le) > at) return null;
  if (at && artisan.valide_le && new Date(artisan.valide_le) <= at) return "valide";
  if (at && artisan.statut !== "refuse") return "en_cours";
  if (artisan.statut === "valide") return "valide";
  if (artisan.statut === "suspendu") return "suspendu";
  if (artisan.statut === "refuse") return "refuse";
  return "en_cours";
}

/** Date de la première inscription, début du curseur « Voir grandir ». */
export function marketStart(artisans: readonly MarketArtisan[], today: Date): Date {
  const first = artisans.reduce<number>(
    (min, a) => Math.min(min, new Date(a.inscrit_le).getTime()),
    today.getTime(),
  );
  return new Date(first);
}

/** Demande regroupée par commune (tous métiers, ou celui choisi). */
export function demandByCommune(
  demand: readonly MarketDemand[],
  trade: string | null = null,
): MarketCommune[] {
  const byCode = new Map<string, MarketCommune>();
  for (const row of demand) {
    if (trade && row.metier !== trade) continue;
    const current = byCode.get(row.code_insee);
    if (current) {
      current.recherches += row.recherches;
      current.resultats += row.resultats;
      current.demandes += row.demandes;
      if (row.metier && !current.metiers.includes(row.metier)) current.metiers.push(row.metier);
    } else {
      byCode.set(row.code_insee, {
        code_insee: row.code_insee,
        ville: row.ville,
        metier: trade,
        lon: row.lon,
        lat: row.lat,
        recherches: row.recherches,
        resultats: row.resultats,
        demandes: row.demandes,
        metiers: row.metier ? [row.metier] : [],
      });
    }
  }
  return [...byCode.values()].sort((a, b) => b.recherches - a.recherches);
}

/** Rayon d'un cercle de demande : surface proportionnelle au nombre de recherches. */
export function demandRadius(recherches: number, max: number): number {
  if (recherches <= 0 || max <= 0) return 0;
  return Math.round(8 + 28 * Math.sqrt(recherches / max));
}

export type MarketFunnelRow = MarketDemand & { aRecruter: boolean };

/**
 * Entonnoir par métier et par commune, du plus recherché au moins recherché : une ligne est « à
 * recruter » quand des particuliers cherchent et qu'aucun artisan validé du métier ne la couvre.
 */
export function marketFunnel(demand: readonly MarketDemand[]): MarketFunnelRow[] {
  return [...demand]
    .sort((a, b) => b.recherches - a.recherches || a.code_insee.localeCompare(b.code_insee))
    .map((row) => ({ ...row, aRecruter: row.recherches > 0 && row.couverture === 0 }));
}

export type MarketTotals = {
  valides: number;
  enCours: number;
  recherches: number;
  resultats: number;
  demandes: number;
  /** Part des recherches qui aboutissent à une demande (pour cent), null sans recherche. */
  tauxDemandes: number | null;
  aRecruter: number;
};

export function marketTotals(
  artisans: readonly MarketArtisan[],
  funnel: readonly MarketFunnelRow[],
): MarketTotals {
  const sum = (key: "recherches" | "resultats" | "demandes") =>
    funnel.reduce((total, row) => total + row[key], 0);
  const recherches = sum("recherches");
  const demandes = sum("demandes");
  return {
    valides: artisans.filter((a) => a.statut === "valide").length,
    enCours: artisans.filter((a) => stageAt(a) === "en_cours").length,
    recherches,
    resultats: sum("resultats"),
    demandes,
    tauxDemandes: recherches ? Math.round((100 * demandes) / recherches) : null,
    aRecruter: funnel.filter((row) => row.aRecruter).length,
  };
}
