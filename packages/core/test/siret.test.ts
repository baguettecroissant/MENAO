import { describe, expect, it } from "vitest";
import { frenchVatNumber, isValidSiret, normalizeSiret, sirenFromSiret } from "../src/siret";

// Numéros fictifs (inexistants dans Sirene, vérifié via l'API : 404) respectant la clé de contrôle ; La Poste : identifiant public.
describe("normalizeSiret", () => {
  it("retire espaces, points et tirets", () => {
    expect(normalizeSiret(" 000 000 018 00010 ")).toBe("00000001800010");
    expect(normalizeSiret("000.000.018-00010")).toBe("00000001800010");
  });
});

describe("isValidSiret", () => {
  it.each(["00000001800010", "00000002600013", "00000003400017"])("accepte %s", (siret) => {
    expect(isValidSiret(siret)).toBe(true);
  });

  it.each([
    ["clé de contrôle fausse", "00000001800011"],
    ["13 chiffres", "0000000180001"],
    ["15 chiffres", "000000018000100"],
    ["lettres", "0000000180001A"],
    ["vide", ""],
  ])("refuse : %s", (_cas, siret) => {
    expect(isValidSiret(siret)).toBe(false);
  });

  it("applique l'exception La Poste (somme des chiffres multiple de 5, siège en Luhn)", () => {
    expect(isValidSiret("35600000000048")).toBe(true);
    expect(isValidSiret("35600000049837")).toBe(true);
    expect(isValidSiret("35600000000049")).toBe(false);
    expect(isValidSiret("00000000049837")).toBe(false);
  });
});

describe("sirenFromSiret et frenchVatNumber", () => {
  it("extrait le SIREN", () => {
    expect(sirenFromSiret("00000001800010")).toBe("000000018");
  });

  it.each([
    ["000000018", "FR66000000018"],
    ["000000026", "FR90000000026"],
    ["356000000", "FR39356000000"],
  ])("TVA intracommunautaire de %s = %s", (siren, tva) => {
    expect(frenchVatNumber(siren)).toBe(tva);
  });
});
