import { describe, expect, it } from "vitest";
import { franceMapPoint } from "../src/france-map";

const projection = { lon0: -5.3, lat1: 51.2, k: 0.688355, echelle: 58.1096 };

describe("franceMapPoint", () => {
  it("place un point de métropole dans le repère de la carte", () => {
    // Bondues (Nord) : en haut, un peu à droite du milieu.
    const p = franceMapPoint(projection, 3.09, 50.7, { largeur: 600, hauteur: 581 });
    expect(p).toEqual({ x: 335.6, y: 29.1 });
  });

  it("rien hors de la carte (outre-mer) ou sans coordonnées", () => {
    expect(franceMapPoint(projection, 55.5, -21.1, { largeur: 600, hauteur: 581 })).toBeNull();
    expect(franceMapPoint(projection, Number.NaN, 50, { largeur: 600, hauteur: 581 })).toBeNull();
  });
});
