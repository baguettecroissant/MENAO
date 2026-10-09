import { describe, expect, it } from "vitest";
import { frenchVatNumber, isValidSiret, normalizeSiret, sirenFromSiret } from "../src/siret";

// Numéros fictifs (préfixe 999) respectant la clé de contrôle ; La Poste : identifiant public.
describe("normalizeSiret", () => {
  it("retire espaces, points et tirets", () => {
    expect(normalizeSiret(" 999 000 011 00018 ")).toBe("99900001100018");
    expect(normalizeSiret("999.000.011-00018")).toBe("99900001100018");
  });
});

describe("isValidSiret", () => {
  it.each(["99900001100018", "99900002900010", "99900003700013"])("accepte %s", (siret) => {
    expect(isValidSiret(siret)).toBe(true);
  });

  it.each([
    ["clé de contrôle fausse", "99900001100019"],
    ["13 chiffres", "9990000110001"],
    ["15 chiffres", "999000011000180"],
    ["lettres", "9990000110001A"],
    ["vide", ""],
  ])("refuse : %s", (_cas, siret) => {
    expect(isValidSiret(siret)).toBe(false);
  });

  it("applique l'exception La Poste (somme des chiffres multiple de 5, siège en Luhn)", () => {
    expect(isValidSiret("35600000000048")).toBe(true);
    expect(isValidSiret("35600000049837")).toBe(true);
    expect(isValidSiret("35600000000049")).toBe(false);
    expect(isValidSiret("99900000049837")).toBe(false);
  });
});

describe("sirenFromSiret et frenchVatNumber", () => {
  it("extrait le SIREN", () => {
    expect(sirenFromSiret("99900001100018")).toBe("999000011");
  });

  it.each([
    ["999000011", "FR66999000011"],
    ["999000029", "FR23999000029"],
    ["356000000", "FR39356000000"],
  ])("TVA intracommunautaire de %s = %s", (siren, tva) => {
    expect(frenchVatNumber(siren)).toBe(tva);
  });
});
