import { describe, expect, it } from "vitest";
import { ZONE_CODE_PATTERN } from "../src/commercial-results";
import {
  COMMERCIAL_MONTHLY_TARGET,
  COMMERCIAL_SECTORS,
  COMMERCIAL_TRADE_TARGETS,
  sectorOfZone,
} from "../src/commercial-sectors";

describe("secteurs des commerciaux (ADR 0367)", () => {
  it("cinq secteurs des Alpes-Maritimes, codes postaux valides et sans doublon dans un secteur", () => {
    expect(COMMERCIAL_SECTORS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    for (const s of COMMERCIAL_SECTORS) {
      expect(s.postalCodes.length).toBeGreaterThan(0);
      expect(new Set(s.postalCodes).size).toBe(s.postalCodes.length);
      for (const code of s.postalCodes) {
        expect(code).toMatch(ZONE_CODE_PATTERN);
        expect(code.startsWith("06")).toBe(true);
      }
    }
  });

  it("villes citées : Nice, Menton, Antibes, Cannes, Grasse dans leur secteur", () => {
    const of = (code: string) =>
      COMMERCIAL_SECTORS.filter((s) => s.postalCodes.includes(code)).map((s) => s.number);
    expect(of("06000")).toEqual([1]);
    expect(of("06500")).toEqual([2]);
    expect(of("06600")).toEqual([3]);
    expect(of("06400")).toEqual([4]);
    expect(of("06130")).toEqual([5]);
    // Vence et Tourrettes-sur-Loup partagent leur code postal.
    expect(of("06140")).toEqual([3, 5]);
  });

  it("reconnaît un secteur à sa zone, quel que soit l'ordre ; zone libre : aucun", () => {
    const cannes = COMMERCIAL_SECTORS[3];
    expect(sectorOfZone([...(cannes?.postalCodes ?? [])].reverse())).toBe(cannes);
    expect(sectorOfZone(["06"])).toBeNull();
    expect(sectorOfZone([])).toBeNull();
  });

  it("objectifs par métier : 30 artisans par mois (7 par semaine), 11 métiers", () => {
    expect(COMMERCIAL_TRADE_TARGETS).toHaveLength(11);
    expect(COMMERCIAL_MONTHLY_TARGET).toBe(30);
  });
});
