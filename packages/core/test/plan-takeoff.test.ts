import { describe, expect, it } from "vitest";
import type { PlanCounts } from "../src/plan-reading";
import {
  type TakeoffRoom,
  defaultFinishes,
  planTakeoff,
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

  it("une mesure absente laisse le poste à compléter, avec la pièce en cause", () => {
    const [ragreage] = posts("carreleur", "Carreleur", [
      room("Entrée", null, 11),
      room("Séjour", 20, 18),
    ]);
    expect(ragreage).toMatchObject({ quantityMilli: null, source: "manque" });
    expect(ragreage?.detail).toBe("À compléter : la surface de Entrée.");
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
      ["Production d'eau chaude", null, "manque"],
      ["Alimentations et évacuations", null, "manque"],
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
    expect(takeoffFigures(lines)).toEqual({ lots: 2, posts: 12, missing: 3, photo: 3 });
  });
});
