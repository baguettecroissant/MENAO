import { describe, expect, it } from "vitest";
import { needInputSchema, projectCriteriaSchema } from "../src/project";

const today = "2026-10-09";
const base = {
  tradeCode: "plombier",
  lieuType: "appartement",
  roomCodes: ["cuisine"],
  workTypeCodes: ["recherche-fuite"],
  surface: "moins_10",
  ville: { code: "06088", nom: "Nice", codePostal: "06000", lon: 7.26, lat: 43.7 },
  adresse: { label: "1 Rue de l'Exemple 06000 Nice", citycode: "06088", lon: 7.26, lat: 43.7 },
  dateMode: "date",
  dateSouhaitee: "2026-10-20",
};

describe("saisie du besoin (F-05)", () => {
  it("texte obligatoire, 5 000 caractères au plus", () => {
    expect(needInputSchema.safeParse({ description: "  " }).success).toBe(false);
    expect(needInputSchema.safeParse({ description: "x".repeat(5001) }).success).toBe(false);
    expect(needInputSchema.parse({ description: " Fuite ", tradeHint: "" })).toEqual({
      description: "Fuite",
      tradeHint: null,
    });
  });
});

describe("critères de recherche (F-07)", () => {
  it("accepte des critères complets", () => {
    expect(projectCriteriaSchema(today).safeParse(base).success).toBe(true);
  });

  it("budget approximatif : une tranche connue, sinon refusé (ADR 0163)", () => {
    expect(projectCriteriaSchema(today).parse({ ...base, budget: "5000_15000" }).budget).toBe(
      "5000_15000",
    );
    expect(projectCriteriaSchema(today).safeParse({ ...base, budget: "beaucoup" }).success).toBe(
      false,
    );
  });

  it("tout est facultatif à l'enregistrement d'une carte", () => {
    const parsed = projectCriteriaSchema(today).parse({
      tradeCode: null,
      lieuType: null,
      roomCodes: [],
      workTypeCodes: [],
      surface: null,
      ville: null,
      adresse: null,
      dateMode: "inconnue",
      dateSouhaitee: null,
    });
    expect(parsed.dateSouhaitee).toBeNull();
    // Budget facultatif (ADR 0163) : absent, il vaut null.
    expect(parsed.budget).toBeNull();
  });

  it("date passée interdite, date obligatoire si « Préciser une date »", () => {
    const schema = projectCriteriaSchema(today);
    expect(schema.safeParse({ ...base, dateSouhaitee: "2026-10-08" }).success).toBe(false);
    expect(schema.safeParse({ ...base, dateSouhaitee: null }).success).toBe(false);
    expect(schema.parse({ ...base, dateMode: "inconnue" }).dateSouhaitee).toBeNull();
  });

  it("l'adresse doit être dans la ville choisie", () => {
    const schema = projectCriteriaSchema(today);
    expect(
      schema.safeParse({ ...base, adresse: { ...base.adresse, citycode: "06004" } }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...base, ville: null }).success).toBe(false);
  });
});
