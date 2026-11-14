import { describe, expect, it } from "vitest";
import {
  PLAN_COUNT_KEYS,
  type PlanReadingRaw,
  chainSum,
  normalizePlanCounts,
  normalizePlanReading,
  planReadingFigures,
  planReadingJsonSchema,
} from "../src/plan-reading";

type RawRoom = PlanReadingRaw["pieces"][number];

const room = (over: Partial<RawRoom> = {}): RawRoom => ({
  fichier: 1,
  page: 2,
  niveau: "RDC",
  nom: "Séjour-cuisine",
  surface_m2: 45.14,
  longueur_m: null,
  largeur_m: null,
  perimetre_m: 27,
  hauteur_m: null,
  humide: false,
  habitable: true,
  certitude: "sure",
  ...over,
});

const raw = (over: Partial<PlanReadingRaw> = {}): PlanReadingRaw => ({
  lisible: true,
  est_un_plan: true,
  echelle: "1/50",
  hauteurs: [{ niveau: "RDC", hauteur_m: 2.5 }],
  pieces: [room()],
  comptes: [
    { element: "portes", nombre: 9 },
    { element: "fenetres", nombre: 11 },
    { element: "wc", nombre: 2 },
    { element: "lavabos", nombre: 3 },
    { element: "douches", nombre: 1 },
    { element: "baignoires", nombre: 1 },
    { element: "eviers", nombre: 1 },
    { element: "escaliers", nombre: 1 },
  ],
  ...over,
});

describe("normalizePlanReading", () => {
  it("reprend une surface écrite sur le plan, en entiers (cm², mm)", () => {
    const { rooms, scale, warnings } = normalizePlanReading(raw(), 1);
    expect(rooms).toEqual([
      {
        level: "RDC",
        name: "Séjour-cuisine",
        areaCm2: 451_400,
        perimeterMm: 27_000,
        heightMm: 2_500,
        wet: false,
        habitable: true,
        source: "plan",
        file: 1,
        page: 2,
        uncertain: false,
      },
    ]);
    expect(scale).toBe("1/50");
    expect(warnings).toEqual([]);
  });

  it("calcule surface et périmètre avec les cotes quand la surface manque", () => {
    const { rooms } = normalizePlanReading(
      raw({
        pieces: [
          room({
            nom: "Dégagement",
            surface_m2: null,
            perimetre_m: null,
            longueur_m: 6.85,
            largeur_m: 1.2,
          }),
        ],
      }),
      1,
    );
    expect(rooms[0]).toMatchObject({ areaCm2: 82_200, perimeterMm: 16_100, source: "cotes" });
  });

  it("garde la surface écrite et complète seulement le périmètre avec les cotes", () => {
    const { rooms } = normalizePlanReading(
      raw({ pieces: [room({ perimetre_m: null, longueur_m: 6.1, largeur_m: 7.4 })] }),
      1,
    );
    expect(rooms[0]).toMatchObject({ areaCm2: 451_400, perimeterMm: 27_000, source: "plan" });
  });

  it("ne devine rien : sans surface ni cotes, la pièce reste à compléter", () => {
    const { rooms, warnings } = normalizePlanReading(
      raw({ pieces: [room({ surface_m2: null, perimetre_m: null })] }),
      1,
    );
    expect(rooms[0]).toMatchObject({ areaCm2: null, perimeterMm: null, source: "plan" });
    expect(warnings).toContain("sans_surfaces");
  });

  it("hauteur de la pièce, sinon celle de son niveau, sinon l'unique hauteur relevée", () => {
    const deux = raw({
      hauteurs: [
        { niveau: "RDC", hauteur_m: 2.5 },
        { niveau: "R+1", hauteur_m: 2.4 },
      ],
      pieces: [
        room({ niveau: "R + 1", nom: "Chambre 2" }),
        room({ niveau: "Combles", nom: "Grenier" }),
        room({ nom: "Cave", hauteur_m: 2.1 }),
      ],
    });
    expect(normalizePlanReading(deux, 1).rooms.map((r) => r.heightMm)).toEqual([
      2_400,
      null,
      2_100,
    ]);
    const une = raw({
      hauteurs: [{ niveau: null, hauteur_m: 2.6 }],
      pieces: [room({ niveau: "R+1" })],
    });
    expect(normalizePlanReading(une, 1).rooms[0]?.heightMm).toBe(2_600);
  });

  it("marque les pièces lues sur une photo, et les lectures incertaines", () => {
    const { rooms, warnings } = normalizePlanReading(
      raw({
        pieces: [room({ fichier: 2, page: 1, nom: "WC" }), room({ certitude: "incertaine" })],
      }),
      2,
      [2],
    );
    expect(rooms.map((r) => [r.source, r.uncertain])).toEqual([
      ["photo", false],
      ["plan", true],
    ]);
    expect(warnings).toContain("photo");
  });

  it("écarte les valeurs absurdes, les noms vides et les fichiers inconnus", () => {
    const { rooms } = normalizePlanReading(
      raw({
        pieces: [
          room({ nom: "   " }),
          room({ surface_m2: -3, perimetre_m: 0, hauteur_m: 40, fichier: 7, page: 0 }),
        ],
      }),
      1,
    );
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({
      areaCm2: null,
      perimeterMm: null,
      heightMm: 2_500,
      file: null,
      page: null,
    });
  });

  it("signale un document illisible ou qui n'est pas un plan", () => {
    expect(normalizePlanReading(raw({ lisible: false, est_un_plan: false }), 1).warnings).toEqual([
      "illisible",
      "pas_un_plan",
    ]);
  });

  it("s'arrête à 200 pièces", () => {
    const pieces = Array.from({ length: 205 }, (_, i) => room({ nom: `Pièce ${i + 1}` }));
    const { rooms, warnings } = normalizePlanReading(raw({ pieces }), 1);
    expect(rooms).toHaveLength(200);
    expect(warnings).toContain("tronque");
  });
});

describe("normalizePlanCounts", () => {
  it("garde les entiers de 0 à 999, le reste est à compléter", () => {
    expect(
      normalizePlanCounts({ portes: 9, fenetres: -1, wc: 2.5, lavabos: "3", douches: 0 }),
    ).toEqual({
      portes: 9,
      fenetres: null,
      wc: null,
      lavabos: null,
      douches: 0,
      baignoires: null,
      eviers: null,
      escaliers: null,
    });
    expect(normalizePlanCounts(null).portes).toBeNull();
  });
});

describe("planReadingFigures", () => {
  it("compte les surfaces lues, calculées, à vérifier et à compléter", () => {
    const { rooms } = normalizePlanReading(
      raw({
        pieces: [
          room(),
          room({ surface_m2: null, perimetre_m: null, longueur_m: 1.2, largeur_m: 6.85 }),
          room({ fichier: 2 }),
          room({ surface_m2: null }),
        ],
      }),
      2,
      [2],
    );
    expect(planReadingFigures(rooms)).toEqual({
      rooms: 4,
      read: 1,
      computed: 1,
      toCheck: 1,
      missing: 1,
    });
  });
});

/** Champs facultatifs (type en liste ou anyOf) d'un schéma JSON, à toute profondeur. */
function unionFields(schema: unknown): number {
  if (!schema || typeof schema !== "object") return 0;
  const node = schema as Record<string, unknown>;
  const own = Array.isArray(node.type) || Array.isArray(node.anyOf) ? 1 : 0;
  return own + Object.values(node).reduce<number>((n, v) => n + unionFields(v), 0);
}

describe("planReadingJsonSchema", () => {
  it("demande chaque champ ; les éléments comptés sont ceux de la liste", () => {
    const schema = planReadingJsonSchema() as {
      required: string[];
      properties: { comptes: { items: { properties: { element: { enum: string[] } } } } };
    };
    expect(schema.required).toEqual([
      "lisible",
      "est_un_plan",
      "echelle",
      "hauteurs",
      "pieces",
      "comptes",
    ]);
    expect(schema.properties.comptes.items.properties.element.enum).toEqual([...PLAN_COUNT_KEYS]);
  });

  it("reste sous la limite de 16 champs facultatifs de la sortie structurée", () => {
    // Au-delà, le fournisseur refuse la requête (« too many parameters with union types »).
    expect(unionFields(planReadingJsonSchema())).toBeLessThanOrEqual(16);
  });

  it("accepte encore les comptes en objet (ancienne forme)", () => {
    const { counts } = normalizePlanReading(raw({ comptes: { portes: 4, wc: null } }), 1);
    expect(counts).toMatchObject({ portes: 4, wc: null, fenetres: null });
  });
});

describe("chaînes de cotes (F-159)", () => {
  const read = (over: Partial<RawRoom>) =>
    normalizePlanReading(
      raw({ pieces: [room({ surface_m2: null, perimetre_m: null, ...over })] }),
      1,
    ).rooms[0];

  it("additionne les cotes lues le long de chaque mur et calcule surface et périmètre", () => {
    // 1,48 + 0,90 + 1,80 = 4,18 m ; 2,47 + 1,05 = 3,52 m ; 4,18 × 3,52 = 14,7136 m².
    expect(
      read({ cotes_longueur_m: [1.48, 0.9, 1.8], cotes_largeur_m: [2.47, 1.05] }),
    ).toMatchObject({ areaCm2: 147_136, perimeterMm: 15_400, source: "cotes" });
  });

  it("préfère une cote écrite d'un seul tenant, et la surface écrite à tout calcul", () => {
    expect(read({ longueur_m: 4.2, cotes_longueur_m: [1, 1], largeur_m: 3 })).toMatchObject({
      areaCm2: 126_000,
    });
    expect(
      read({ surface_m2: 15, cotes_longueur_m: [1.48, 0.9], cotes_largeur_m: [2.47] }),
    ).toMatchObject({ areaCm2: 150_000, source: "plan" });
  });

  it("ne calcule rien avec une chaîne vide, incomplète ou douteuse", () => {
    expect(read({ cotes_longueur_m: [1.48, 0.9], cotes_largeur_m: [] })?.areaCm2).toBeNull();
    expect(read({ cotes_longueur_m: [1.48, -1], cotes_largeur_m: [2] })?.areaCm2).toBeNull();
    expect(read({})?.areaCm2).toBeNull();
    expect(chainSum(Array.from({ length: 13 }, () => 1))).toBeNull();
    expect(chainSum([150, 150])).toBeNull();
    expect(chainSum("4,18")).toBeNull();
  });
});
