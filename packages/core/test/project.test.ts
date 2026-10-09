import { describe, expect, it } from "vitest";
import {
  LIEU_TYPES,
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SURFACE_TRANCHES,
  canSearchArtisans,
  needHelpLevel,
  scrubPersonalData,
} from "../src/project";

describe("nettoyage avant envoi à l'IA (F-06)", () => {
  it("retire e-mails et numéros de téléphone", () => {
    const text =
      "Fuite sous l'évier à Nice. Rappelez-moi au 06 39 98 00 01 ou +33 6 39 98 00 02, ou écrivez à camille.exemple@example.test.";
    const clean = scrubPersonalData(text);
    expect(clean).not.toMatch(/39 98/);
    expect(clean).not.toMatch(/example\.test/);
    expect(clean).toContain("[téléphone]");
    expect(clean).toContain("[e-mail]");
    expect(clean).toContain("Fuite sous l'évier à Nice.");
  });

  it("garde les dimensions, surfaces et codes postaux", () => {
    const text = "Salle de bain de 6 m², carrelage 60x60, à Antibes 06600, budget 4 500 €.";
    expect(scrubPersonalData(text)).toBe(text);
  });
});

describe("règles de la recherche (F-05, F-07)", () => {
  it("référentiels de la spec", () => {
    expect(LIEU_TYPES).toEqual(["appartement", "maison", "jardin", "entreprise"]);
    expect(SURFACE_TRANCHES).toEqual(["moins_10", "10_20", "20_50", "plus_50"]);
    expect(MAX_PROJECT_PHOTOS).toBe(10);
    expect(PROJECT_TEXT_MAX_LENGTH).toBe(5000);
  });

  it("aide contextuelle selon le niveau de détail", () => {
    expect(needHelpLevel("")).toBe("vide");
    expect(needHelpLevel("Fuite cuisine")).toBe("insuffisant");
    expect(
      needHelpLevel(
        "Fuite sous l'évier de la cuisine dans un appartement à Nice, à réparer rapidement svp.",
      ),
    ).toBe("suffisant");
  });

  it("le bouton « Trouver l'artisan idéal » exige un métier et une ville", () => {
    expect(canSearchArtisans({ tradeCode: "plombier", villeCodeInsee: "06088" })).toBe(true);
    expect(canSearchArtisans({ tradeCode: null, villeCodeInsee: "06088" })).toBe(false);
    expect(canSearchArtisans({ tradeCode: "plombier", villeCodeInsee: null })).toBe(false);
  });
});
