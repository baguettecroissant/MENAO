import { describe, expect, it } from "vitest";
import { planScale, planTileGrid, planTileLabel } from "../src/plan-tiles";

describe("planTileGrid", () => {
  it("ne découpe pas une photo que la vue d'ensemble montre déjà en entier", () => {
    expect(planTileGrid(2400, 1700)).toEqual([]);
    expect(planTileGrid(2600, 2600)).toEqual([]);
    expect(planTileGrid(0, 100)).toEqual([]);
  });

  it("choisit la grille la plus légère dont chaque zone tient dans la résolution du modèle", () => {
    expect(planTileGrid(4000, 2300).map((t) => [t.cols, t.rows])[0]).toEqual([2, 1]);
    expect(planTileGrid(4200, 3000).map((t) => [t.cols, t.rows])[0]).toEqual([2, 2]);
    expect(planTileGrid(6400, 4500)).toHaveLength(6);
    // Plan en hauteur : la grille est tournée.
    expect(planTileGrid(3000, 4200).map((t) => [t.cols, t.rows])[0]).toEqual([2, 2]);
    expect(planTileGrid(4500, 6400).map((t) => [t.cols, t.rows])[0]).toEqual([2, 3]);
  });

  it("couvre toute la photo, avec recouvrement, sans en sortir", () => {
    for (const [w, h] of [
      [6400, 4500],
      [4200, 3000],
      [4000, 2300],
      [9000, 6000],
    ] as const) {
      const tiles = planTileGrid(w, h);
      for (const t of tiles) {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.x + t.w).toBeLessThanOrEqual(w);
        expect(t.y + t.h).toBeLessThanOrEqual(h);
      }
      expect(Math.max(...tiles.map((t) => t.x + t.w))).toBe(w);
      expect(Math.max(...tiles.map((t) => t.y + t.h))).toBe(h);
      const [a, b] = tiles;
      if (a && b && a.row === b.row) expect(a.x + a.w).toBeGreaterThan(b.x);
    }
  });

  it("garde les zones sous la résolution du modèle tant que le plan le permet", () => {
    for (const t of planTileGrid(6400, 4500)) {
      expect(t.w).toBeLessThanOrEqual(2400);
      expect(t.h).toBeLessThanOrEqual(2400);
    }
  });
});

describe("planScale et planTileLabel", () => {
  it("réduit sans jamais agrandir", () => {
    expect(planScale(8000, 4000, 6400)).toBe(0.8);
    expect(planScale(3000, 2000, 6400)).toBe(1);
  });
  it("nomme une zone par son rang et sa place dans la grille", () => {
    expect(planTileLabel({ col: 2, row: 1, cols: 3, rows: 2 })).toBe(
      "zone 2 sur 6 (ligne 1 sur 2, colonne 2 sur 3)",
    );
  });
});
