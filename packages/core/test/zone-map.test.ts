import { describe, expect, it } from "vitest";
import { ZONE_RADIUS_OPTIONS_KM } from "../src/artisan-signup";
import { ZONE_MAP_FILL, zoneMapView, type ZoneMapTile } from "../src/zone-map";

// Centre de Toulouse (lieu public) et cadre de l'étape « zone » du site.
const TOULOUSE = { lon: 1.444, lat: 43.604 };
const FRAME = { width: 560, height: 208 };

function covers(tiles: ZoneMapTile[], axis: "x" | "y", size: number) {
  const start = axis === "x" ? "left" : "top";
  const length = axis === "x" ? "width" : "height";
  const spans = [...new Map(tiles.map((t) => [t[start], t[length]])).entries()].sort(
    (a, b) => a[0] - b[0],
  );
  const ends = spans.map(([from, span]) => from + span);
  expect(spans[0]?.[0]).toBeLessThanOrEqual(0);
  expect(ends.at(-1)).toBeGreaterThanOrEqual(size);
  // Aucun interstice entre deux tuiles voisines.
  expect(spans.slice(1).map(([from]) => from)).toEqual(ends.slice(0, -1));
}

describe("aperçu cartographique de la zone (ADR 0126)", () => {
  it("le cercle occupe 80 % du petit côté du cadre, quel que soit le rayon", () => {
    expect(ZONE_MAP_FILL).toBe(0.8);
    for (const radiusKm of ZONE_RADIUS_OPTIONS_KM) {
      expect(zoneMapView({ ...TOULOUSE, ...FRAME, radiusKm }).circle).toBe(166);
    }
    expect(zoneMapView({ ...TOULOUSE, width: 300, height: 400, radiusKm: 30 }).circle).toBe(240);
  });

  it("la carte s'éloigne quand le rayon grandit", () => {
    const zooms = ZONE_RADIUS_OPTIONS_KM.map(
      (radiusKm) => zoneMapView({ ...TOULOUSE, ...FRAME, radiusKm }).zoom,
    );
    expect(zooms).toEqual([10, 9, 8, 8, 7, 7]);
  });

  it("le cercle est à l'échelle : 1 km au sol vaut le même nombre de pixels partout", () => {
    // Taille affichée d'une tuile = 256 px × 2^(zoom exact − zoom entier) ; un rayon de 30 km
    // occupe donc 83 px, la moitié du cercle.
    const view = zoneMapView({ ...TOULOUSE, ...FRAME, radiusKm: 30 });
    const tileWidth = view.tiles[0]?.width ?? 0;
    const metersPerPx =
      (40_075_016.686 * Math.cos((TOULOUSE.lat * Math.PI) / 180)) / (tileWidth * 2 ** view.zoom);
    expect(Math.abs((view.circle / 2) * metersPerPx - 30_000)).toBeLessThan(400);
  });

  it("les tuiles couvrent tout le cadre, sans interstice", () => {
    for (const radiusKm of ZONE_RADIUS_OPTIONS_KM) {
      const { tiles } = zoneMapView({ ...TOULOUSE, ...FRAME, radiusKm });
      covers(tiles, "x", FRAME.width);
      covers(tiles, "y", FRAME.height);
      expect(tiles.length).toBeLessThanOrEqual(24);
    }
  });

  it("l'adresse de départ tombe au centre du cadre", () => {
    const view = zoneMapView({ ...TOULOUSE, ...FRAME, radiusKm: 20 });
    const n = 2 ** view.zoom;
    const lat = (TOULOUSE.lat * Math.PI) / 180;
    const x = Math.floor(((TOULOUSE.lon + 180) / 360) * n);
    const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);
    const tile = view.tiles.find((t) => t.x === x && t.y === y);
    if (!tile) throw new Error("tuile de l'adresse absente");
    expect(tile.left).toBeLessThanOrEqual(FRAME.width / 2);
    expect(tile.left + tile.width).toBeGreaterThan(FRAME.width / 2);
    expect(tile.top).toBeLessThanOrEqual(FRAME.height / 2);
    expect(tile.top + tile.height).toBeGreaterThan(FRAME.height / 2);
  });

  it("numéros de tuiles toujours valides, même près de l'antiméridien", () => {
    const view = zoneMapView({ lon: 179.99, lat: -16.5, ...FRAME, radiusKm: 100 });
    const n = 2 ** view.zoom;
    for (const t of view.tiles) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(n);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(n);
    }
  });

  it("cadre pas encore mesuré : aucune tuile", () => {
    expect(zoneMapView({ ...TOULOUSE, width: 0, height: 208, radiusKm: 30 }).tiles).toEqual([]);
  });
});
