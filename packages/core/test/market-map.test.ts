import { describe, expect, it } from "vitest";
import {
  demandByCommune,
  demandRadius,
  fitView,
  kmToPixels,
  marketFunnel,
  marketStart,
  marketTotals,
  panView,
  projectPoint,
  stageAt,
  visibleTiles,
  zoomView,
  type MarketArtisan,
  type MarketDemand,
} from "../src/market-map";

const nice = { lon: 7.262, lat: 43.7102 };
const antibes = { lon: 7.1255, lat: 43.5804 };

const artisan = (overrides: Partial<MarketArtisan> = {}): MarketArtisan => ({
  id: "a1",
  nom: "Plomberie Fictive",
  statut: "valide",
  metiers: ["plombier"],
  lon: nice.lon,
  lat: nice.lat,
  rayon_km: 20,
  zone_labels: [],
  commune: "Nice",
  inscrit_le: "2026-10-01T10:00:00Z",
  valide_le: "2026-10-05T10:00:00Z",
  ...overrides,
});

const demand = (overrides: Partial<MarketDemand> = {}): MarketDemand => ({
  code_insee: "06004",
  ville: "Antibes",
  metier: "plombier",
  lon: antibes.lon,
  lat: antibes.lat,
  recherches: 4,
  resultats: 3,
  demandes: 1,
  couverture: 0,
  couverture_large: 0,
  ...overrides,
});

describe("carte du marché : calculs de la carte (ADR 0181)", () => {
  const view = { lon: nice.lon, lat: nice.lat, zoom: 10 };

  it("le centre de la vue est au milieu du cadre ; l'est à droite, le sud en bas", () => {
    expect(projectPoint(view, 800, 500, nice.lon, nice.lat)).toEqual({ x: 400, y: 250 });
    const p = projectPoint(view, 800, 500, antibes.lon, antibes.lat);
    expect(p.x).toBeLessThan(400);
    expect(p.y).toBeGreaterThan(250);
  });

  it("tuiles du cadre, sans trou ni dépassement inutile", () => {
    const tiles = visibleTiles(view, 800, 500);
    expect(tiles.length).toBeGreaterThanOrEqual(12);
    expect(tiles.every((t) => t.z === 10 && t.left > -256 && t.left < 800 && t.top < 500)).toBe(
      true,
    );
    expect(visibleTiles(view, 0, 500)).toEqual([]);
  });

  it("glisser vers la droite montre l'ouest", () => {
    expect(panView(view, 100, 0).lon).toBeLessThan(view.lon);
    expect(panView(view, 0, 100).lat).toBeGreaterThan(view.lat);
  });

  it("zoom centré sur le curseur : le point sous la souris ne bouge pas", () => {
    const zoomed = zoomView(view, 1, 800, 500, 600, 100);
    expect(zoomed.zoom).toBe(11);
    const before = projectPoint(view, 800, 500, antibes.lon, antibes.lat);
    const anchorLonLat = { x: 600, y: 100 };
    expect(before).not.toEqual(anchorLonLat);
    // Le point du monde sous (600, 100) avant le zoom y reste après.
    const probe = panView(view, 400 - 600, 250 - 100);
    const after = projectPoint(zoomed, 800, 500, probe.lon, probe.lat);
    expect(Math.round(after.x)).toBe(600);
    expect(Math.round(after.y)).toBe(100);
    expect(zoomView({ ...view, zoom: 16 }, 1, 800, 500).zoom).toBe(16);
  });

  it("cadrage : tous les points visibles ; Côte d'Azur sans point", () => {
    const fit = fitView([nice, antibes], 800, 500);
    for (const point of [nice, antibes]) {
      const p = projectPoint(fit, 800, 500, point.lon, point.lat);
      expect(p.x).toBeGreaterThanOrEqual(48);
      expect(p.x).toBeLessThanOrEqual(752);
      expect(p.y).toBeGreaterThanOrEqual(48);
      expect(p.y).toBeLessThanOrEqual(452);
    }
    expect(fitView([], 800, 500)).toEqual({ lon: 7.15, lat: 43.75, zoom: 9 });
  });

  it("rayons à l'échelle", () => {
    expect(kmToPixels(10, 43.7, 10)).toBeGreaterThan(kmToPixels(10, 43.7, 9));
  });
});

describe("carte du marché : artisans et demande (ADR 0181)", () => {
  it("étape d'un artisan à une date : absent, en cours, puis validé", () => {
    const a = artisan();
    expect(stageAt(a, new Date("2026-09-30T00:00:00Z"))).toBeNull();
    expect(stageAt(a, new Date("2026-10-03T00:00:00Z"))).toBe("en_cours");
    expect(stageAt(a, new Date("2026-10-06T00:00:00Z"))).toBe("valide");
    expect(stageAt(artisan({ statut: "suspendu" }))).toBe("suspendu");
    expect(stageAt(artisan({ statut: "brouillon", valide_le: null }))).toBe("en_cours");
  });

  it("début du curseur : la première inscription", () => {
    const today = new Date("2026-10-24T00:00:00Z");
    expect(
      marketStart([artisan(), artisan({ inscrit_le: "2026-09-12T08:00:00Z" })], today),
    ).toEqual(new Date("2026-09-12T08:00:00Z"));
    expect(marketStart([], today)).toEqual(today);
  });

  it("demande par commune, tous métiers ou un seul ; cercles proportionnels", () => {
    const rows = [
      demand(),
      demand({ metier: "peintre", recherches: 2, resultats: 2, demandes: 0 }),
    ];
    expect(demandByCommune(rows)).toEqual([
      expect.objectContaining({
        recherches: 6,
        resultats: 5,
        demandes: 1,
        metiers: ["plombier", "peintre"],
      }),
    ]);
    expect(demandByCommune(rows, "peintre")[0]?.recherches).toBe(2);
    // La couverture dépend du métier : elle ne s'additionne pas d'un métier à l'autre.
    expect(demandByCommune(rows)[0]).not.toHaveProperty("couverture");
    expect(demandRadius(10, 10)).toBe(36);
    expect(demandRadius(0, 10)).toBe(0);
    expect(demandRadius(1, 10)).toBeLessThan(demandRadius(4, 10));
  });

  it("une commune couverte seulement par une région ou la France n'est pas à recruter", () => {
    const [row] = marketFunnel([demand({ couverture: 1, couverture_large: 1 })]);
    expect(row?.aRecruter).toBe(false);
  });

  it("entonnoir trié et communes à recruter ; totaux", () => {
    const funnel = marketFunnel([
      demand({ code_insee: "06088", ville: "Nice", recherches: 2, couverture: 1 }),
      demand(),
    ]);
    expect(funnel.map((row) => [row.ville, row.couverture, row.aRecruter])).toEqual([
      ["Antibes", 0, true],
      ["Nice", 1, false],
    ]);
    expect(
      marketTotals([artisan(), artisan({ statut: "brouillon", valide_le: null })], funnel),
    ).toEqual({
      valides: 1,
      enCours: 1,
      recherches: 6,
      resultats: 6,
      demandes: 2,
      tauxDemandes: 33,
      aRecruter: 1,
    });
  });
});
