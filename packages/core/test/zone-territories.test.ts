import { describe, expect, it } from "vitest";
import {
  departementOfInsee,
  isTerritoryCode,
  isTerritoryZoneMode,
  searchTerritories,
  territoryLabel,
  territoryOfInsee,
  ZONE_DEPARTEMENTS,
  ZONE_REGIONS,
} from "../src/zone-territories";

describe("référentiel des territoires (ADR 0213)", () => {
  it("compte 101 départements et 18 régions, chaque département dans une région connue", () => {
    expect(ZONE_DEPARTEMENTS).toHaveLength(101);
    expect(ZONE_REGIONS).toHaveLength(18);
    const regions = new Set(ZONE_REGIONS.map((r) => r.code));
    expect(ZONE_DEPARTEMENTS.every((d) => regions.has(d.region))).toBe(true);
    expect(new Set(ZONE_DEPARTEMENTS.map((d) => d.code)).size).toBe(101);
  });

  it("donne le département d'une commune, Corse et outre-mer compris", () => {
    expect(departementOfInsee("06088")).toBe("06");
    expect(departementOfInsee("2A004")).toBe("2A");
    expect(departementOfInsee("97411")).toBe("974");
    expect(departementOfInsee("98000")).toBeNull();
  });

  it("propose le territoire de l'adresse de départ", () => {
    expect(territoryOfInsee("departements", "06088")).toBe("06");
    expect(territoryOfInsee("regions", "06088")).toBe("93");
    expect(territoryOfInsee("regions", "99999")).toBeNull();
  });

  it("nomme les territoires", () => {
    expect(territoryLabel("departements", "06")).toBe("Alpes-Maritimes (06)");
    expect(territoryLabel("regions", "93")).toBe("Provence-Alpes-Côte d'Azur");
  });

  it("distingue les codes selon le mode", () => {
    expect(isTerritoryCode("departements", "2A")).toBe(true);
    expect(isTerritoryCode("regions", "2A")).toBe(false);
    expect(isTerritoryCode("regions", "93")).toBe(true);
    expect(isTerritoryCode("departements", "20")).toBe(false);
  });

  it("cherche sans accent, par nom ou par numéro exact", () => {
    expect(searchTerritories("departements", "06").map((t) => t.code)).toEqual(["06"]);
    expect(searchTerritories("departements", "herault").map((t) => t.code)).toEqual(["34"]);
    expect(searchTerritories("regions", "cote d azur").map((t) => t.code)).toEqual(["93"]);
    expect(searchTerritories("departements", "   ")).toEqual([]);
  });

  it("repère les modes par territoire", () => {
    expect(isTerritoryZoneMode("france")).toBe(true);
    expect(isTerritoryZoneMode("rayon")).toBe(false);
    expect(isTerritoryZoneMode(null)).toBe(false);
  });
});
