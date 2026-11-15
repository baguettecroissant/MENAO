import { describe, expect, it } from "vitest";
import type { PlanCounts } from "../src/plan-reading";
import {
  type TakeoffRoom,
  type TakeoffWork,
  defaultFinishes,
  planTakeoff,
  withPlanHeight,
  takeoffFigures,
} from "../src/plan-takeoff";

const room = (
  name: string,
  area: number | null,
  perimeter: number | null,
  over: Partial<TakeoffRoom> = {},
): TakeoffRoom => {
  const base = {
    name,
    level: "RDC",
    areaCm2: area === null ? null : Math.round(area * 10_000),
    perimeterMm: perimeter === null ? null : Math.round(perimeter * 1000),
    heightMm: 2500,
    wet: false,
    habitable: true,
    source: "plan" as const,
    uncertain: false,
    ...over,
  };
  return { ...base, finishes: over.finishes ?? defaultFinishes(base) };
};

// Maison fictive des maquettes (lot 35).
const ROOMS: TakeoffRoom[] = [
  room("Entrée", 7.44, 11),
  room("Séjour-cuisine", 45.14, 27),
  room("Dégagement", 8.22, 16.1, { source: "cotes" }),
  room("Chambre 1", 10.88, 13.2),
  room("Salle d'eau", 12.41, 14.1, { wet: true }),
  room("Cellier", 5.72, 9.6),
  room("Garage", 18.91, 18.4, { habitable: false }),
  room("Chambre 2", 12.3, 14.2, { level: "R+1" }),
  room("Salle de bains", 8.7, 11.8, { level: "R+1", wet: true }),
  room("WC", 1.65, 5.2, { level: "R+1", wet: true, source: "photo" }),
];
const COUNTS: PlanCounts = {
  portes: 9,
  fenetres: 11,
  wc: 2,
  lavabos: 3,
  douches: 1,
  baignoires: 1,
  eviers: 1,
  escaliers: 0,
};
const posts = (code: string, label: string, rooms = ROOMS, counts = COUNTS) =>
  planTakeoff(rooms, counts, [{ code, label }]).filter((l) => l.kind === "poste");

describe("defaultFinishes", () => {
  it("propose carrelage et faïence dans les pièces d'eau, parquet dans les chambres", () => {
    expect(defaultFinishes({ name: "Salle d'eau", wet: true, habitable: true })).toEqual({
      floor: "carrelage",
      walls: "faience",
      ceiling: "peinture",
      tileHeightMm: 2100,
    });
    expect(defaultFinishes({ name: "WC", wet: true, habitable: true }).tileHeightMm).toBe(1200);
    expect(defaultFinishes({ name: "Chambre 2", wet: false, habitable: true }).floor).toBe(
      "parquet",
    );
    expect(defaultFinishes({ name: "Séjour", wet: false, habitable: true }).floor).toBe(
      "carrelage",
    );
    expect(defaultFinishes({ name: "Garage", wet: false, habitable: false })).toEqual({
      floor: "aucun",
      walls: "aucun",
      ceiling: "aucun",
      tileHeightMm: null,
    });
  });
});

describe("planTakeoff", () => {
  it("crée un titre de lot par métier, puis ses postes numérotés", () => {
    const lines = planTakeoff(ROOMS, COUNTS, [
      { code: "carreleur", label: "Carreleur" },
      { code: "peintre", label: "Peintre" },
    ]);
    expect(lines[0]).toMatchObject({
      kind: "titre",
      code: "LOT 01",
      designation: "CARRELEUR",
      lot: "LOT 01 CARRELEUR",
    });
    expect(lines.filter((l) => l.kind === "titre").map((l) => l.code)).toEqual([
      "LOT 01",
      "LOT 02",
    ]);
    expect(lines[1]).toMatchObject({ kind: "poste", code: "1.1", lot: "LOT 01 CARRELEUR" });
  });

  it("carrelage : surfaces des pièces carrelées, plinthes, faïence, étanchéité à compléter", () => {
    const [ragreage, sol, plinthes, faience, spec] = posts("carreleur", "Carreleur");
    // 7,44 + 45,14 + 8,22 + 12,41 + 5,72 + 8,70 + 1,65 = 89,28 m² ; le WC vient d'une photo.
    expect(sol).toMatchObject({
      designation: "Carrelage de sol",
      unit: "m2",
      unitLabel: "m²",
      quantityMilli: 89_280,
      source: "photo",
    });
    expect(ragreage?.quantityMilli).toBe(89_280);
    expect(sol?.detail).toContain("Séjour-cuisine 45,14");
    // Entrée 11 + Séjour 27 + Dégagement 16,1 + Cellier 9,6 = 63,7 − 4 portes × 0,83 = 60,38 ml.
    expect(plinthes).toMatchObject({ quantityMilli: 60_380, source: "calcul" });
    expect(plinthes?.detail).toContain("4 portes × 0,83");
    // (14,1 × 2,1 − 0,83 × 2,04) + (11,8 × 2,1 − 0,83 × 2,04) + (5,2 × 1,2 − 0,83 × 1,2).
    expect(faience).toMatchObject({ quantityMilli: 27_917 + 23_087 + 5_244, source: "photo" });
    expect(spec).toMatchObject({ quantityMilli: null, source: "manque" });
  });

  it("une surface lue sur le plan reste « plan », une surface calculée devient « calcul »", () => {
    const [plafonds] = posts("peintre", "Peintre", [room("Séjour", 20, 18)]);
    expect(plafonds).toMatchObject({ quantityMilli: 20_000, source: "plan" });
    const [cotes] = posts("peintre", "Peintre", [room("Séjour", 20, 18, { source: "cotes" })]);
    expect(cotes?.source).toBe("calcul");
  });

  it("une pièce sans mesure ne bloque pas le total : il est partiel, la pièce est nommée", () => {
    const [ragreage, , plinthes] = posts("carreleur", "Carreleur", [
      room("Entrée", null, null),
      room("Séjour", 20, 18),
    ]);
    expect(ragreage).toMatchObject({ quantityMilli: 20_000, source: "partiel" });
    expect(ragreage?.detail).toBe("Séjour 20 = 20 m² · sans Entrée : la surface à compléter.");
    // 18 − 0,83 = 17,17 ml, sur la seule pièce dont le périmètre est connu.
    expect(plinthes).toMatchObject({ quantityMilli: 17_170, source: "partiel" });
    expect(plinthes?.detail).toContain("sans Entrée : le périmètre à compléter.");
  });

  it("sans aucune pièce mesurée, le poste reste à compléter", () => {
    const [ragreage] = posts("carreleur", "Carreleur", [room("Entrée", null, 11)]);
    expect(ragreage).toMatchObject({ quantityMilli: null, source: "manque" });
    expect(ragreage?.detail).toBe("À compléter : la surface de Entrée.");
  });

  it("un nombre déduit d'une règle par pièce n'est ni lu ni estimé", () => {
    const [points] = posts("electricien", "Électricien", [
      room("Salon", 17, 16, { source: "estime" }),
      room("WC", 1.5, 5, { source: "photo" }),
    ]);
    expect(points).toMatchObject({ quantityMilli: 2000, source: "calcul" });
  });

  it("peinture des murs : périmètre × hauteur, moins faïence, portes et fenêtres", () => {
    const rooms = [room("Chambre", 12, 14), room("Salle d'eau", 6, 10, { wet: true })];
    const [, murs] = posts("peintre", "Peintre", rooms, { ...COUNTS, fenetres: 2 });
    // 14 × 2,5 + 10 × 2,5 = 60 ; faïence 10 × 2,1 = 21 ; portes 0,83 × 2,04 + 0,83 × 0 = 1,6932 ;
    // fenêtres 2 × 1,5 = 3 → 34,3068 m².
    expect(murs).toMatchObject({
      designation: "Peinture des murs",
      quantityMilli: 34_307,
      source: "calcul",
    });
  });

  it("plomberie : appareils comptés sur le plan ; 0 = pas de poste ; inconnu = à compléter", () => {
    const lines = posts("plombier", "Plombier", ROOMS, { ...COUNTS, baignoires: 0, eviers: null });
    expect(lines.map((l) => [l.designation, l.quantityMilli, l.source])).toEqual([
      ["WC", 2000, "plan"],
      ["Lavabos et vasques", 3000, "plan"],
      ["Douches", 1000, "plan"],
      ["Éviers", null, "manque"],
      // Ce ne sont pas des mesures : une unité ou un ensemble, à choisir ou à chiffrer.
      ["Production d'eau chaude", 1000, "calcul"],
      ["Alimentations et évacuations", 1000, "calcul"],
    ]);
  });

  it("électricité : un point lumineux par pièce habitable, prises au minimum de la norme", () => {
    const rooms = [
      room("Séjour", 30, 22),
      room("Chambre", 11, 13),
      room("WC", 1.5, 5, { wet: true }),
      room("Garage", 18, 18, { habitable: false }),
    ];
    const [points, prises] = posts("electricien", "Électricien", rooms);
    expect(points).toMatchObject({ quantityMilli: 3000, source: "calcul" });
    // Séjour 30 m² → 8 ; chambre 3 ; WC 0 ; garage 1.
    expect(prises?.quantityMilli).toBe(12_000);
  });

  it("menuiserie : parquet et plinthes bois des pièces parquetées, portes et fenêtres comptées", () => {
    const lines = posts("menuisier", "Menuisier");
    expect(lines.map((l) => [l.designation, l.quantityMilli])).toEqual([
      ["Parquet", 23_180],
      ["Plinthes bois", 25_740],
      ["Blocs-portes intérieurs", 9000],
      ["Fenêtres et portes-fenêtres", 11_000],
    ]);
  });

  it("un métier sans mesure applicable garde un poste à compléter", () => {
    expect(posts("couvreur", "Couvreur").every((l) => l.source === "manque")).toBe(true);
    const [only] = posts("metier-inconnu", "Ébéniste");
    expect(only).toMatchObject({
      designation: "Ouvrages du lot ébéniste",
      unit: "forfait",
      source: "manque",
    });
    const [vide] = posts("carreleur", "Carreleur", [room("Chambre", 12, 14)], {
      ...COUNTS,
      douches: 0,
    });
    expect(vide?.source).toBe("manque");
  });
});

describe("takeoffFigures", () => {
  it("compte lots, postes, postes à compléter et quantités tirées d'une photo", () => {
    const lines = planTakeoff(ROOMS, COUNTS, [
      { code: "carreleur", label: "Carreleur" },
      { code: "plombier", label: "Plombier" },
    ]);
    expect(takeoffFigures(lines)).toEqual({
      lots: 2,
      posts: 12,
      // Seule l'étanchéité sous douche reste vide : les deux postes forfaitaires sont renseignés.
      missing: 1,
      photo: 3,
      estimated: 0,
      partial: 0,
    });
  });
});

describe("pièce estimée à l'échelle (F-159, lot 2)", () => {
  it("marque « estime » toute quantité qui s'appuie sur une pièce estimée", () => {
    const rooms = [
      room("Chambre 1", 11.38, 13.52),
      room("Salon", 17.26, 16.63, { source: "estime" }),
    ];
    const lines = posts("peintre", "Peintre", rooms).filter((l) => l.quantityMilli !== null);
    expect(lines.find((l) => l.designation === "Peinture des plafonds")).toMatchObject({
      quantityMilli: 28_640,
      source: "estime",
    });
    expect(
      takeoffFigures(planTakeoff(rooms, COUNTS, [{ code: "peintre", label: "Peintre" }])).estimated,
    ).toBeGreaterThan(0);
  });

  describe("ouvrages écrits sur le plan (F-159 lot 6)", () => {
    const written = (name: string, trade: string, over: Partial<TakeoffWork> = {}) => ({
      name,
      kind: "surface" as const,
      quantityMilli: null,
      source: "plan" as const,
      detail: null,
      trade,
      page: 1,
      uncertain: false,
      room: "Salon",
      removal: false,
      ...over,
    });
    const TRADES = [
      { code: "plaquiste", label: "Plaquiste" },
      { code: "couvreur", label: "Couvreur" },
      { code: "demolition", label: "Démolition, dépose" },
    ];
    const works = [
      written("Faux plafond suspendu BA13", "plaquiste", {
        quantityMilli: 17_100,
        source: "calcul",
        detail: "Surface de la pièce : Salon",
      }),
      written("Cloison BA13 de 10 cm", "plaquiste"),
      written("Baignoire à déposer", "plombier", {
        kind: "nombre",
        quantityMilli: 1000,
        source: "unite",
        room: "Salle d'eau",
        removal: true,
      }),
    ];

    it("met les déposes dans un lot Démolition en tête, et ne crée pas un lot vide", () => {
      const lines = planTakeoff(ROOMS, COUNTS, TRADES, works);
      expect(lines.filter((l) => l.kind === "titre").map((l) => l.lot)).toEqual([
        "LOT 01 DÉMOLITION, DÉPOSE",
        "LOT 02 PLAQUISTE",
      ]);
      expect(lines.filter((l) => l.kind === "poste")).toMatchObject([
        {
          code: "1.1",
          designation: "Baignoire à déposer — Salle d'eau",
          unit: "u",
          quantityMilli: 1000,
          source: "plan",
        },
        {
          code: "2.1",
          designation: "Faux plafond suspendu BA13 — Salon",
          quantityMilli: 17_100,
          source: "calcul",
          detail: "Surface de la pièce : Salon = 17,10 m²",
        },
        {
          code: "2.2",
          designation: "Cloison BA13 de 10 cm — Salon",
          quantityMilli: null,
          source: "manque",
          detail: "À compléter : à mesurer d'un tracé sur le plan.",
        },
      ]);
    });

    it("sans lot Démolition, une dépose n'est pas chiffrée", () => {
      const lines = planTakeoff(ROOMS, COUNTS, [{ code: "plombier", label: "Plombier" }], works);
      expect(lines.some((l) => l.designation.includes("Baignoire à déposer"))).toBe(false);
    });

    it("garde un poste à compléter s'il ne resterait aucun lot", () => {
      const lines = planTakeoff(ROOMS, COUNTS, TRADES.slice(1), []);
      expect(lines.map((l) => l.designation)).toEqual([
        "COUVREUR",
        "Couverture",
        "Gouttières et descentes",
      ]);
    });

    const base = defaultFinishes({ name: "x", wet: false, habitable: true });

    it("sols existants conservés : remise en état, sans carrelage ni chape", () => {
      const kept = [
        room("WC", 1.48, 5, { finishes: { ...base, floor: "existant_nettoyer" } }),
        room("Salon", 17.1, 17, { finishes: { ...base, floor: "parquet_poncer" } }),
      ];
      const lines = planTakeoff(kept, COUNTS, [
        { code: "carreleur", label: "Carreleur" },
        { code: "menuisier", label: "Menuisier" },
        { code: "macon", label: "Maçon" },
      ]);
      const of = (name: string) => lines.find((l) => l.designation === name)?.quantityMilli;
      expect(of("Nettoyage et remise en état du sol existant")).toBe(1480);
      expect(of("Ponçage et finition du parquet existant")).toBe(17_100);
      expect(of("Carrelage de sol")).toBeUndefined();
      expect(of("Parquet")).toBeUndefined();
      expect(of("Chape")).toBeUndefined();
    });

    it("ne compte pas deux fois un faux plafond écrit pièce par pièce", () => {
      const plaque = [room("Salon", 17.1, 17, { finishes: { ...base, ceiling: "plaque" } })];
      const lines = planTakeoff(plaque, COUNTS, TRADES.slice(0, 1), works);
      expect(lines.filter((l) => /plafond/i.test(l.designation)).map((l) => l.designation)).toEqual(
        ["Faux plafond suspendu BA13 — Salon"],
      );
    });

    it("essai réel : ni doublon ni poste de convention quand le plan écrit l'ouvrage", () => {
      const plaque = { ...base, ceiling: "plaque" as const };
      const house = [
        room("salon", 16.98, 16.49, { finishes: plaque }),
        room("entrée", 7.64, 11.4, { finishes: plaque }),
        room("sdb 1", 5.91, 10.35, { finishes: plaque, wet: true }),
      ];
      const w = (name: string, trade: string, roomName: string | null, over = {}) =>
        written(name, trade, {
          room: roomName,
          kind: "nombre",
          quantityMilli: 1000,
          source: "unite",
          ...over,
        });
      const notes = [
        w("faux plafond suspendu ba13", "plaquiste", "entrée", {
          kind: "surface",
          quantityMilli: 7640,
          source: "calcul",
        }),
        w("mur à peindre", "peintre", "entrée", {
          kind: "surface",
          quantityMilli: null,
          source: "plan",
        }),
        w("porte à peindre", "peintre", "entrée"),
        w("receveur de douche 90x80", "plombier", "sdb 1"),
        w("nouveau radiateur fonte", "chauffagiste", "salon"),
        w("F-01 · menuiserie pvc fenêtre OF · 167 × 208 cm", "menuisier", null),
      ];
      const lines = planTakeoff(
        house,
        COUNTS,
        ["plaquiste", "peintre", "plombier", "chauffagiste", "menuisier"].map((code) => ({
          code,
          label: code,
        })),
        notes,
      );
      const names = lines.filter((l) => l.kind === "poste").map((l) => l.designation);
      // Le faux plafond du salon et de la salle de bain reste dans le total ; l'entrée est écrite.
      const ceiling = lines.find((l) => l.designation === "Faux plafond en plaques de plâtre");
      expect(ceiling?.quantityMilli).toBe(16_980 + 5_910);
      expect(names).toContain("faux plafond suspendu ba13 — entrée");
      // Murs de l'entrée déjà peints par la règle : pas de ligne « à compléter » en plus.
      expect(names).toContain("Peinture des murs");
      expect(names).not.toContain("mur à peindre — entrée");
      // Postes de convention remplacés par ce que le plan écrit.
      expect(names).not.toContain("Peinture des portes intérieures");
      expect(names).not.toContain("Douches");
      expect(names).not.toContain("Émetteurs de chauffage");
      expect(names).not.toContain("Fenêtres et portes-fenêtres");
      expect(names).toContain("WC");
    });
  });
});

describe("withPlanHeight", () => {
  it("reprend la hauteur la plus fréquente pour une pièce sans hauteur, sauf sous rampant", () => {
    const rooms = [
      room("salon", 17, 16.5, { heightMm: 2700 }),
      room("entrée", 7.6, 11.4, { heightMm: 2700 }),
      room("wc", 1.5, 5.3, { heightMm: 2500 }),
      room("cuisine", 9.9, 12.8, { heightMm: null }),
      room("chambre 1", 11.4, 13.5, { heightMm: null, sloped: true }),
    ];
    const filled = withPlanHeight(rooms);
    expect(filled.map((r) => [r.name, r.heightMm, r.heightEstimated ?? false])).toEqual([
      ["salon", 2700, false],
      ["entrée", 2700, false],
      ["wc", 2500, false],
      ["cuisine", 2700, true],
      ["chambre 1", null, false],
    ]);
    const paint = planTakeoff(rooms, COUNTS, [{ code: "peintre", label: "Peintre" }]).find(
      (l) => l.designation === "Peinture des murs",
    );
    // Partiel (chambre sous rampant) l'emporte ; la hauteur reprise est dite dans le détail.
    expect(paint?.source).toBe("partiel");
    expect(paint?.detail).toContain("hauteur 2,7 m reprise des autres pièces pour cuisine");
  });
});
