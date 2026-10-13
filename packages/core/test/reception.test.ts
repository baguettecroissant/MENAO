import { describe, expect, it } from "vitest";
import { CHANTIER_TRANSITIONS } from "../src/chantier-state";
import {
  WARRANTY_YEARS,
  warranties,
  decennaleInsurer,
  warrantyEnd,
  RESERVES_ESCALATION_DAYS,
  RESERVES_LIMITS,
  RESERVES_REMINDER_DAYS,
  canLiftReserves,
  canStartReception,
  receptionNumber,
} from "../src/reception";

describe("réception des travaux (F-25, F-26)", () => {
  it("réception ouverte une fois la fin des travaux déclarée", () => {
    expect(canStartReception("travaux_termines")).toBe(true);
    expect(canStartReception("en_cours")).toBe(false);
    expect(canStartReception("reserves_a_lever")).toBe(false);
  });

  it("PV sans réserves : réceptionné ; avec réserves : réserves à lever (spec §9)", () => {
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "travaux_termines",
      "pv_sans_reserves",
      "receptionne",
    ]);
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "travaux_termines",
      "pv_avec_reserves",
      "reserves_a_lever",
    ]);
  });

  it("numéro PV-AAAA-R01, par artisan et par année", () => {
    expect(receptionNumber(2026, 1)).toBe("PV-2026-R01");
    expect(receptionNumber(2026, 12)).toBe("PV-2026-R12");
    expect(receptionNumber(2027, 104)).toBe("PV-2027-R104");
  });

  it("réserves : 10 à 2 000 caractères", () => {
    expect(RESERVES_LIMITS).toEqual({ min: 10, max: 2000 });
  });

  it("levée des réserves : pendant les réserves à lever, relance à J+7, ticket à J+30", () => {
    expect(canLiftReserves("reserves_a_lever")).toBe(true);
    expect(canLiftReserves("receptionne")).toBe(false);
    expect([RESERVES_REMINDER_DAYS, RESERVES_ESCALATION_DAYS]).toEqual([7, 30]);
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "reserves_a_lever",
      "reserves_levees",
      "receptionne",
    ]);
  });
});

describe("garanties après réception (F-12, ADR 0041)", () => {
  it("parfait achèvement 1 an, bon fonctionnement 2 ans, décennale 10 ans", () => {
    expect(WARRANTY_YEARS).toEqual({ parfaitAchevement: 1, bonFonctionnement: 2, decennale: 10 });
  });

  it("échéance au même quantième, 29 février ramené au 28 les années non bissextiles", () => {
    expect(warrantyEnd("2026-10-12", 1)).toBe("2027-10-12");
    expect(warrantyEnd("2026-10-12", 10)).toBe("2036-10-12");
    expect(warrantyEnd("2028-02-29", 1)).toBe("2029-02-28");
    expect(warrantyEnd("2028-02-29", 4)).toBe("2032-02-29");
    expect(warrantyEnd("2026-01-31", 2)).toBe("2028-01-31");
  });

  it("garanties en cours ou échues à une date donnée", () => {
    expect(warranties("2026-10-12", "2027-10-12")).toEqual([
      { kind: "parfaitAchevement", until: "2027-10-12", active: true },
      { kind: "bonFonctionnement", until: "2028-10-12", active: true },
      { kind: "decennale", until: "2036-10-12", active: true },
    ]);
    expect(warranties("2026-10-12", "2027-10-13").map((w) => w.active)).toEqual([
      false,
      true,
      true,
    ]);
  });
});

describe("assureur décennal repris du devis (garanties)", () => {
  it("nom et numéro de contrat, si l'assureur est renseigné", () => {
    expect(decennaleInsurer({ assureur: "Assurances Exemple", numero: "DEC-123" })).toEqual({
      name: "Assurances Exemple",
      policy: "DEC-123",
    });
    expect(decennaleInsurer({ assureur: "Assurances Exemple", numero: " " })).toEqual({
      name: "Assurances Exemple",
      policy: null,
    });
  });

  it("rien si l'assureur manque ou si la donnée est inattendue", () => {
    expect(decennaleInsurer(null)).toBeNull();
    expect(decennaleInsurer("Assurances Exemple")).toBeNull();
    expect(decennaleInsurer({ assureur: "  ", numero: "DEC-123" })).toBeNull();
  });
});
