import { describe, expect, it } from "vitest";
import {
  LIEU_TYPES,
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SURFACE_TRANCHES,
  analysisNeedsFallback,
  canSearchArtisans,
  completeCriteria,
  needAnalysisJsonSchema,
  ARTISAN_BRIEF_MAX_LENGTH,
  BUDGET_TRANCHES,
  photosAdvised,
  needHelpLevel,
  normalizeNeedAnalysis,
  parisToday,
  scrubPersonalData,
  type NeedCriteria,
  type ProjectCriteriaState,
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
    expect(BUDGET_TRANCHES).toEqual([
      "moins_1000",
      "1000_5000",
      "5000_15000",
      "15000_50000",
      "plus_50000",
    ]);
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
    budget_tranche: "moins_1000",
    brief_artisan:
      "Fuite sous l'évier de la cuisine d'un appartement à Nice.   Intervention souhaitée avant le 20 octobre.",
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
    expect(c.budget).toBe("moins_1000");
    expect(c.artisanBrief).toBe(
      "Fuite sous l'évier de la cuisine d'un appartement à Nice. Intervention souhaitée avant le 20 octobre.",
    );
    expect(analysisNeedsFallback(c)).toBe(false);
  });

  it("budget hors liste écarté, résumé pour l'artisan borné (ADR 0163)", () => {
    const c = normalizeNeedAnalysis(
      { ...raw, budget_tranche: "un peu", brief_artisan: "x".repeat(900) },
      ref,
      "2026-10-09",
    );
    expect(c.budget).toBeNull();
    expect(c.artisanBrief).toHaveLength(ARTISAN_BRIEF_MAX_LENGTH);
    expect(
      normalizeNeedAnalysis({ ...raw, brief_artisan: "  " }, ref, "2026-10-09").artisanBrief,
    ).toBeNull();
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

describe("description modifiée : la nouvelle analyse complète les critères (F-07)", () => {
  const empty: ProjectCriteriaState = {
    tradeCode: null,
    lieuType: null,
    roomCodes: [],
    workTypeCodes: [],
    surface: null,
    villeCodeInsee: null,
    adresse: null,
    dateMode: "inconnue",
    dateSouhaitee: null,
  };
  const analysed: NeedCriteria = {
    tradeCode: "plombier",
    lieuType: "appartement",
    roomCodes: ["cuisine"],
    workTypeCodes: ["fuite"],
    surface: "moins_10",
    ville: "Nice",
    codePostal: "06000",
    adresse: "1 rue de l'Exemple",
    dateMode: "des_que_possible",
    dateSouhaitee: null,
    urgence: true,
    summary: "Réparer une fuite sous l'évier de la cuisine.",
    budget: null,
    artisanBrief: null,
    confiance: 0.93,
  };
  const nice = { villeCode: "06088", adresse: "1 Rue de l'Exemple 06000 Nice" };

  it("remplit tous les critères encore vides", () => {
    const done = completeCriteria(empty, analysed, nice);
    expect(done).toMatchObject({
      tradeCode: "plombier",
      lieuType: "appartement",
      roomCodes: ["cuisine"],
      workTypeCodes: ["fuite"],
      surface: "moins_10",
      dateMode: "des_que_possible",
      dateSouhaitee: null,
      takeVille: true,
      takeAdresse: true,
    });
    expect(done.completed).toEqual(["trade", "site", "address", "date"]);
  });

  it("ne remplace jamais un choix déjà fait", () => {
    const chosen: ProjectCriteriaState = {
      tradeCode: "plombier",
      lieuType: "maison",
      roomCodes: ["salle-de-bain"],
      workTypeCodes: ["chauffe-eau"],
      surface: "10_20",
      villeCodeInsee: "06004",
      adresse: "2 avenue de l'Exemple 06600 Antibes",
      dateMode: "date",
      dateSouhaitee: "2026-11-02",
    };
    const done = completeCriteria(chosen, analysed, nice);
    const { villeCodeInsee: _ville, adresse: _adresse, ...kept } = chosen;
    expect(done).toMatchObject({ ...kept, takeVille: false, takeAdresse: false });
    expect(done.completed).toEqual([]);
  });

  it("complète une carte en partie remplie sans toucher au reste", () => {
    const partial = { ...empty, tradeCode: "plombier", roomCodes: ["salle-de-bain"] };
    const done = completeCriteria(partial, analysed, nice);
    expect(done.roomCodes).toEqual(["salle-de-bain"]);
    expect(done.workTypeCodes).toEqual(["fuite"]);
    expect(done.lieuType).toBe("appartement");
    expect(done.completed).toEqual(["site", "address", "date"]);
  });

  it("ne reprend que les travaux du métier retenu", () => {
    const done = completeCriteria({ ...empty, tradeCode: "carreleur" }, analysed, nice);
    expect(done.tradeCode).toBe("carreleur");
    expect(done.workTypeCodes).toEqual([]);
  });

  it("adresse reprise seulement dans la ville retenue", () => {
    const antibes = { ...empty, villeCodeInsee: "06004" };
    const done = completeCriteria(antibes, analysed, nice);
    expect(done.takeVille).toBe(false);
    expect(done.takeAdresse).toBe(false);
    expect(done.completed).not.toContain("address");

    const sameCity = completeCriteria({ ...empty, villeCodeInsee: "06088" }, analysed, nice);
    expect(sameCity.takeVille).toBe(false);
    expect(sameCity.takeAdresse).toBe(true);
    expect(sameCity.completed).toContain("address");
  });

  it("ville ou adresse introuvables : rien n'est repris", () => {
    const done = completeCriteria(empty, analysed, { villeCode: null, adresse: null });
    expect(done.takeVille).toBe(false);
    expect(done.takeAdresse).toBe(false);
    expect(done.completed).not.toContain("address");
  });

  it("date : une date connue n'est pas remplacée, une date inconnue est complétée", () => {
    const precise = { ...analysed, dateMode: "date" as const, dateSouhaitee: "2026-11-15" };
    expect(completeCriteria(empty, precise, nice)).toMatchObject({
      dateMode: "date",
      dateSouhaitee: "2026-11-15",
    });
    const asap = { ...empty, dateMode: "des_que_possible" as const };
    expect(completeCriteria(asap, precise, nice)).toMatchObject({
      dateMode: "des_que_possible",
      dateSouhaitee: null,
    });
    const nothing = { ...analysed, dateMode: "inconnue" as const };
    expect(completeCriteria(empty, nothing, nice).completed).not.toContain("date");
  });
});

describe("date du jour à Paris", () => {
  it("bascule à minuit heure de Paris, pas UTC", () => {
    expect(parisToday(new Date("2026-10-09T21:30:00Z"))).toBe("2026-10-09");
    expect(parisToday(new Date("2026-10-09T22:30:00Z"))).toBe("2026-10-10");
  });
});

describe("photos conseillées quand la description reste vague (ADR 0163)", () => {
  const precise =
    "Remplacer le mitigeur de la douche et reprendre le joint silicone autour du receveur qui fuit";
  it("conseillées sans photo si le texte est court, les travaux inconnus ou l'analyse peu sûre", () => {
    const base = { description: precise, photoCount: 0, workTypeCount: 2, confidence: 0.9 };
    expect(photosAdvised(base)).toBe(false);
    expect(photosAdvised({ ...base, description: "refaire ma salle de bains" })).toBe(true);
    expect(photosAdvised({ ...base, workTypeCount: 0 })).toBe(true);
    expect(photosAdvised({ ...base, confidence: 0.5 })).toBe(true);
    expect(photosAdvised({ ...base, confidence: null })).toBe(false);
  });

  it("jamais demandées quand il y a déjà une photo", () => {
    expect(
      photosAdvised({
        description: "salle de bains",
        photoCount: 1,
        workTypeCount: 0,
        confidence: 0.2,
      }),
    ).toBe(false);
  });
});
