import { describe, expect, it } from "vitest";
import {
  type PlanWorksRaw,
  normalizePlanWorks,
  planPageTypes,
  planWorksFigures,
  planWorksJsonSchema,
} from "../src/plan-works";
import { planTakeoff, takeoffFigures } from "../src/plan-takeoff";
import { normalizePlanCounts } from "../src/plan-reading";

type RawWork = NonNullable<PlanWorksRaw["ouvrages"]>[number];
const work = (nom: string, mesure: string, over: Partial<RawWork> = {}): RawWork => ({
  fichier: 1,
  page: 1,
  nom,
  mesure,
  quantite: null,
  compte: false,
  surface_m2: null,
  epaisseur_m: null,
  altitude_haute_m: null,
  altitude_basse_m: null,
  metier: "",
  certitude: "sure",
  ...over,
});

// Terrain fictif de la maquette du lot 52.
const RAW: PlanWorksRaw = {
  pages: [
    { fichier: 1, page: 1, type: "masse" },
    { fichier: 1, page: 2, type: "coupe_terrain" },
    { fichier: 1, page: 3, type: "reseaux" },
  ],
  altitudes: [
    { nom: "Terrain naturel", altitude_m: 102.4 },
    { nom: "Plateforme", altitude_m: 101.2 },
  ],
  ouvrages: [
    work("Terrain", "surface", { quantite: 812 }),
    work("Plateforme à terrasser", "surface", { quantite: 186, metier: "terrassier" }),
    work("Décapage de la terre végétale", "volume", {
      page: 2,
      surface_m2: 186,
      epaisseur_m: 0.3,
      metier: "terrassier",
    }),
    work("Déblais de la plateforme", "volume", {
      page: 2,
      surface_m2: 186,
      altitude_haute_m: 102.4,
      altitude_basse_m: 101.2,
      metier: "terrassier",
    }),
    work("Tranchée des réseaux", "lineaire", { page: 3, quantite: 42, metier: "terrassier" }),
    work("Pelouse", "surface", { quantite: 310, metier: "paysagiste" }),
    work("Arbres à planter", "nombre", { quantite: 6, compte: true, metier: "paysagiste" }),
    work("Haie à planter", "lineaire", { metier: "paysagiste" }),
  ],
};
const TRADES = ["terrassier", "paysagiste"];
const read = (raw: PlanWorksRaw = RAW, photos: number[] = []) =>
  normalizePlanWorks(raw, 2, photos, TRADES);
const byName = (name: string, raw?: PlanWorksRaw, photos?: number[]) =>
  read(raw, photos).works.find((w) => w.name === name);

describe("normalizePlanWorks", () => {
  it("reprend telle quelle une quantité écrite sur le plan", () => {
    expect(byName("Plateforme à terrasser")).toMatchObject({
      kind: "surface",
      quantityMilli: 186_000,
      source: "plan",
      detail: null,
      trade: "terrassier",
      page: 1,
    });
    expect(byName("Tranchée des réseaux")).toMatchObject({ quantityMilli: 42_000, page: 3 });
  });

  it("calcule un volume avec une surface et une épaisseur lues, et garde le calcul", () => {
    expect(byName("Décapage de la terre végétale")).toMatchObject({
      quantityMilli: 55_800,
      source: "calcul",
      detail: "186,00 m² × 0,30 m",
    });
  });

  it("calcule un volume avec une surface et deux altitudes lues", () => {
    expect(byName("Déblais de la plateforme")).toMatchObject({
      quantityMilli: 223_200,
      source: "calcul",
      detail: "186,00 m² × (102,40 − 101,20)",
    });
  });

  it("ne devine rien : sans valeur lue, la quantité reste à compléter", () => {
    expect(byName("Haie à planter")).toMatchObject({ quantityMilli: null, source: "plan" });
    const raw = {
      ouvrages: [
        work("Remblais", "volume", { surface_m2: 50 }),
        work("Fouilles", "volume", { epaisseur_m: 0.8 }),
        work("Déblais", "volume", { surface_m2: 50, altitude_haute_m: 10, altitude_basse_m: 12 }),
        // Une surface n'est jamais déduite d'une épaisseur, ni un linéaire de deux cotes.
        work("Allée", "surface", { surface_m2: 62, epaisseur_m: 0.2 }),
      ],
    };
    expect(read(raw).works.map((w) => w.quantityMilli)).toEqual([null, null, null, null]);
  });

  it("préfère le volume écrit au calcul", () => {
    const raw = {
      ouvrages: [work("Déblais", "volume", { quantite: 210, surface_m2: 186, epaisseur_m: 1.2 })],
    };
    expect(read(raw).works[0]).toMatchObject({ quantityMilli: 210_000, source: "plan" });
  });

  it("distingue un nombre compté sur les symboles d'un nombre écrit", () => {
    expect(byName("Arbres à planter")).toMatchObject({ quantityMilli: 6000, source: "compte" });
    const raw = { ouvrages: [work("Regards", "nombre", { quantite: 4 })] };
    expect(read(raw).works[0]).toMatchObject({ quantityMilli: 4000, source: "plan" });
    expect(
      read({ ouvrages: [work("Regards", "nombre", { quantite: 2.5 })] }).works[0],
    ).toMatchObject({ quantityMilli: null });
  });

  it("garde un repère hors lot et ignore un métier qui n'est pas choisi", () => {
    expect(byName("Terrain")?.trade).toBeNull();
    const raw = {
      ouvrages: [work("Mur de clôture", "lineaire", { quantite: 20, metier: "macon" })],
    };
    expect(read(raw).works[0]?.trade).toBeNull();
  });

  it("marque ce qui vient d'une photo comme à vérifier", () => {
    const raw = {
      ouvrages: [
        work("Pelouse", "surface", { fichier: 2, quantite: 310 }),
        work("Déblais", "volume", { fichier: 2, surface_m2: 100, epaisseur_m: 0.5 }),
      ],
    };
    const works = read(raw, [2]).works;
    expect(works[0]).toMatchObject({ source: "photo", uncertain: false });
    expect(works[1]).toMatchObject({ source: "calcul", uncertain: true, quantityMilli: 50_000 });
  });

  it("écarte les valeurs hors bornes, les mesures inconnues et les noms vides", () => {
    const raw = {
      ouvrages: [
        work("", "surface", { quantite: 10 }),
        work("Inconnu", "poids", { quantite: 10 }),
        work("Négatif", "surface", { quantite: -4 }),
        work("Fichier absent", "surface", { fichier: 9, quantite: 12 }),
      ],
    };
    expect(read(raw).works).toEqual([
      expect.objectContaining({ name: "Négatif", quantityMilli: null }),
      expect.objectContaining({ name: "Fichier absent", file: null, quantityMilli: 12_000 }),
    ]);
  });

  it("relève les types de pages et les altitudes", () => {
    const { pages, levels } = read({
      ...RAW,
      pages: [
        ...(RAW.pages ?? []),
        { fichier: 1, page: 1, type: "niveau" },
        { fichier: 1, page: 4, type: "x" },
      ],
    });
    expect(planPageTypes(pages)).toEqual(["masse", "coupe_terrain", "reseaux"]);
    expect(levels).toEqual([
      { name: "Terrain naturel", altitudeMm: 102_400 },
      { name: "Plateforme", altitudeMm: 101_200 },
    ]);
  });

  it("accepte une réponse sans ouvrages (anciens plans de niveaux)", () => {
    expect(normalizePlanWorks({}, 1)).toEqual({ works: [], pages: [], levels: [] });
  });
});

describe("façades et toiture", () => {
  const one = (o: RawWork) => read({ ouvrages: [o] }).works[0];

  it("calcule une surface de façade avec deux cotes écrites", () => {
    expect(one(work("Façade sud", "surface", { longueur_m: 12.4, largeur_m: 6.2 }))).toMatchObject({
      quantityMilli: 76_880,
      source: "calcul",
      detail: "12,40 m × 6,20 m",
    });
  });

  it("calcule un versant avec la surface au sol et la pente écrites", () => {
    // 35° : 1 ÷ cos 35° = 1,221 ; 40 % : √(1 + 0,4²) = 1,077.
    expect(
      one(work("Versant nord", "surface", { surface_m2: 86, pente: 35, pente_unite: "degres" })),
    ).toMatchObject({
      quantityMilli: 105_006,
      source: "calcul",
      detail: "86,00 m² × 1,221 (pente 35°)",
    });
    expect(
      one(work("Versant sud", "surface", { surface_m2: 86, pente: 40, pente_unite: "pourcent" })),
    ).toMatchObject({ quantityMilli: 92_622, detail: "86,00 m² × 1,077 (pente 40 %)" });
  });

  it("préfère la surface écrite et ne devine ni cote ni pente", () => {
    expect(
      one(work("Façade", "surface", { quantite: 80, longueur_m: 12.4, largeur_m: 6.2 })),
    ).toMatchObject({ quantityMilli: 80_000, source: "plan", detail: null });
    for (const over of [
      { longueur_m: 12.4 },
      { surface_m2: 86 },
      { surface_m2: 86, pente: 35, pente_unite: "" },
      { surface_m2: 86, pente: 80, pente_unite: "degres" },
      { surface_m2: 86, pente: 0, pente_unite: "pourcent" },
      { pente: 35, pente_unite: "degres" },
    ]) {
      expect(one(work("Versant", "surface", over))?.quantityMilli).toBeNull();
    }
    // Un linéaire (gouttière, garde-corps) n'est jamais calculé.
    expect(
      one(work("Gouttière", "lineaire", { longueur_m: 12, largeur_m: 2 }))?.quantityMilli,
    ).toBeNull();
  });

  it("range façades, toiture et garde-corps dans leurs lots", () => {
    const lots = [
      { code: "couvreur", label: "Couvreur" },
      { code: "facadier", label: "Façadier" },
      { code: "serrurier", label: "Serrurier" },
      { code: "charpentier", label: "Charpentier" },
    ];
    const { works } = normalizePlanWorks(
      {
        ouvrages: [
          work("Couverture en tuiles", "surface", {
            surface_m2: 86,
            pente: 35,
            pente_unite: "degres",
            metier: "couvreur",
          }),
          work("Gouttières", "lineaire", { quantite: 24.8, metier: "couvreur" }),
          work("Fenêtres de toit", "nombre", { quantite: 2, compte: true, metier: "couvreur" }),
          work("Façade sud", "surface", { longueur_m: 12.4, largeur_m: 6.2, metier: "facadier" }),
          work("Garde-corps du balcon", "lineaire", { quantite: 4.5, metier: "serrurier" }),
        ],
      },
      1,
      [],
      lots.map((l) => l.code),
    );
    const posts = planTakeoff([], normalizePlanCounts({}), lots, works).filter(
      (l) => l.kind === "poste",
    );
    expect(posts.map((l) => `${l.code} ${l.designation} ${l.source}`)).toEqual([
      "1.1 Couverture en tuiles calcul",
      "1.2 Gouttières plan",
      "1.3 Fenêtres de toit plan",
      "2.1 Façade sud calcul",
      "3.1 Garde-corps du balcon plan",
      "4.1 Charpente manque",
    ]);
    expect(posts[0]?.detail).toBe("86,00 m² × 1,221 (pente 35°) = 105,01 m²");
  });
});

describe("planWorksFigures", () => {
  it("compte les quantités écrites, calculées, comptées et à compléter", () => {
    expect(planWorksFigures(read().works)).toEqual({
      works: 8,
      written: 4,
      computed: 2,
      counted: 1,
      toCheck: 0,
      missing: 1,
    });
  });
});

describe("planWorksJsonSchema", () => {
  it("reste sous la limite de champs facultatifs de la sortie structurée", () => {
    const text = JSON.stringify(planWorksJsonSchema());
    expect(text.match(/"null"/g)?.length).toBe(8);
  });
});

describe("planTakeoff avec des ouvrages", () => {
  const lots = [
    { code: "terrassier", label: "Terrassier" },
    { code: "paysagiste", label: "Paysagiste" },
  ];
  const lines = planTakeoff([], normalizePlanCounts({}), lots, read().works);
  const posts = lines.filter((l) => l.kind === "poste");

  it("range chaque ouvrage dans le lot de son métier, sans le poste d'attente", () => {
    expect(posts.map((l) => `${l.code} ${l.designation}`)).toEqual([
      "1.1 Plateforme à terrasser",
      "1.2 Décapage de la terre végétale",
      "1.3 Déblais de la plateforme",
      "1.4 Tranchée des réseaux",
      "2.1 Pelouse",
      "2.2 Arbres à planter",
      "2.3 Haie à planter",
    ]);
  });

  it("garde l'unité, l'origine et le calcul de chaque quantité", () => {
    expect(posts[0]).toMatchObject({
      unit: "m2",
      unitLabel: "m²",
      quantityMilli: 186_000,
      source: "plan",
      detail: "Écrit sur le plan, page 1.",
    });
    expect(posts[1]).toMatchObject({
      unit: "m3",
      source: "calcul",
      detail: "186,00 m² × 0,30 m = 55,80 m³",
    });
    expect(posts[3]).toMatchObject({ unit: "ml", quantityMilli: 42_000 });
    expect(posts[5]).toMatchObject({ unit: "u", source: "plan", detail: "Compté sur le plan : 6" });
    expect(posts[6]).toMatchObject({ quantityMilli: null, source: "manque" });
    expect(takeoffFigures(lines)).toMatchObject({ lots: 2, posts: 7, missing: 1 });
  });

  it("signale une valeur saisie ou tirée d'une photo", () => {
    const works = read().works.map((w, i) =>
      i === 1 ? { ...w, source: "saisi" as const } : i === 5 ? { ...w, uncertain: true } : w,
    );
    const out = planTakeoff([], normalizePlanCounts({}), lots, works).filter(
      (l) => l.kind === "poste",
    );
    expect(out[0]).toMatchObject({ source: "saisi", detail: "Valeur saisie dans le relevé." });
    expect(out[4]).toMatchObject({ source: "photo" });
  });

  it("garde le poste d'attente d'un métier sans ouvrage", () => {
    const out = planTakeoff([], normalizePlanCounts({}), lots, []).filter(
      (l) => l.kind === "poste",
    );
    expect(out.map((l) => l.designation)).toEqual([
      "Terrassement",
      "Aménagement des espaces verts",
    ]);
  });
});
