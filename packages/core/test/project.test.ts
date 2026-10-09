import { describe, expect, it } from "vitest";
import {
  LIEU_TYPES,
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SURFACE_TRANCHES,
  analysisNeedsFallback,
  canSearchArtisans,
  needAnalysisJsonSchema,
  needHelpLevel,
  normalizeNeedAnalysis,
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

describe("normalisation de l'analyse IA (F-06)", () => {
  const ref = {
    trades: ["plombier", "carreleur"],
    workTypes: [
      { code: "fuite", trade: "plombier" },
      { code: "pose-carrelage", trade: "carreleur" },
    ],
    rooms: ["cuisine", "salle-de-bain"],
  };
  const raw = {
    metier: "plombier",
    lieu_type: "appartement",
    pieces: ["cuisine", "inconnue", "cuisine"],
    travaux: ["fuite", "pose-carrelage"],
    surface_tranche: "moins_10",
    ville: "  Nice ",
    code_postal: "06000",
    adresse: null,
    date_souhaitee: "2026-10-20",
    urgence: false,
    resume: "Réparer une fuite sous l'évier de la cuisine.",
    confiance: 0.92,
  };

  it("garde les valeurs valides et écarte le reste", () => {
    const c = normalizeNeedAnalysis(raw, ref, "2026-10-09");
    expect(c.tradeCode).toBe("plombier");
    expect(c.roomCodes).toEqual(["cuisine"]);
    expect(c.workTypeCodes).toEqual(["fuite"]); // pose-carrelage n'est pas un travail de plombier
    expect(c.ville).toBe("Nice");
    expect(c.dateMode).toBe("date");
    expect(c.dateSouhaitee).toBe("2026-10-20");
    expect(analysisNeedsFallback(c)).toBe(false);
  });

  it("refuse les dates passées et les valeurs hors liste", () => {
    const c = normalizeNeedAnalysis(
      {
        ...raw,
        metier: "astronaute",
        lieu_type: "chateau",
        surface_tranche: "enorme",
        date_souhaitee: "2026-10-08",
        urgence: true,
        confiance: 3,
      },
      ref,
      "2026-10-09",
    );
    expect(c.tradeCode).toBeNull();
    expect(c.lieuType).toBeNull();
    expect(c.surface).toBeNull();
    expect(c.workTypeCodes).toEqual([]);
    expect(c.dateSouhaitee).toBeNull();
    expect(c.dateMode).toBe("des_que_possible");
    expect(c.confiance).toBe(1);
    expect(analysisNeedsFallback(c)).toBe(true); // pas de métier
  });

  it("repli sur le modèle de secours si la confiance est faible", () => {
    expect(
      analysisNeedsFallback(normalizeNeedAnalysis({ ...raw, confiance: 0.55 }, ref, "2026-10-09")),
    ).toBe(true);
  });

  it("schéma JSON compatible avec les sorties structurées", () => {
    const schema = needAnalysisJsonSchema(ref);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(JSON.stringify(schema)).not.toMatch(/minimum|maximum|minLength|maxLength/);
    expect(schema.properties.metier).toEqual({
      anyOf: [{ type: "string", enum: ref.trades }, { type: "null" }],
    });
  });
});
