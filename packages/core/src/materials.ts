/**
 * Calculs de fournitures du chat « Demander à MENAO » (F-160, ADR 0345) : l'IA choisit le calcul
 * et ses mesures (lues sur le plan ou données par l'artisan), ces fonctions comptent. Longueurs en
 * mm, surfaces en cm², poids en g, montants en centimes ; chaque résultat garde ses étapes.
 * Ratios par défaut tirés des fiches des fabricants ; ceux de l'artisan les remplacent.
 */
export type RatioSource = { label: string; url: string };

export const MATERIAL_RATIOS = {
  /** Cloison 72/48, une plaque BA13 par face : quantités pour 1 m² de cloison (deux faces). */
  partition: {
    boardFactorPermille: 1050,
    screwsPerM2: 22,
    tapeMmPerM2: 2800,
    compoundGPerM2: 600,
    studSpacingMm: 600,
    source: {
      label: "Placo, cloison Placostil 72/48 BA13 (fiche Éphéméride cloison)",
      url: "https://www.placo.fr/documents/brochure-marketing/ephemeride-placo-cloison.pdf",
    },
  },
  /** Plafond sur fourrures Stil F530 à 0,50 m, suspentes tous les 1,20 m : pour 1 m² de plafond. */
  ceiling: {
    boardFactorPermille: 1050,
    furringMmPerM2: 2200,
    furringSpacingMm: 500,
    hangerSpacingMm: 1200,
    source: {
      label: "Placo, fourrure Stil F530 (fiche technique, plafond jointoyé)",
      url: "https://entrepot-du-bricolage.fr/mediaw/pdf/fiche_technique_fourrure-stil-f530-3-m-45x18-mm-placo-.pdf",
    },
  },
} as const;

/** Longueurs de montants vendues (mm) : la plus courte qui laisse 1 cm sous le plafond. */
export const STUD_LENGTHS_MM = [2500, 2600, 2700, 2800, 3000, 3500, 4000] as const;

export type CalcStep = { key: string; label: string; formula: string; value: number; unit: string };

const ceilDiv = (a: number, b: number) => Math.ceil(a / b - 1e-9);
const m2 = (cm2: number) => (cm2 / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const ml = (mm: number) => (mm / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function positive(value: number, what: string) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${what} invalide`);
}

export type PartitionInput = {
  /** Longueur de chaque cloison (une ossature par cloison). */
  runsMm: readonly number[];
  heightMm: number;
  /** 2 : cloison (deux faces) ; 1 : doublage contre un mur. */
  sides?: 1 | 2;
  /** Plaques par face (parement simple ou double). */
  boardsPerFace?: 1 | 2;
  boardWidthMm?: number;
  boardHeightMm?: number;
  railLengthMm?: number;
  screwsPerBox?: number;
  tapeRollMm?: number;
  compoundBagG?: number;
};

export function partitionTakeoff(input: PartitionInput) {
  const r = MATERIAL_RATIOS.partition;
  const sides = input.sides ?? 2;
  const perFace = input.boardsPerFace ?? 1;
  const boardW = input.boardWidthMm ?? 1200;
  const boardH = input.boardHeightMm ?? 2500;
  const railLength = input.railLengthMm ?? 3000;
  if (input.runsMm.length === 0) throw new RangeError("aucune cloison");
  input.runsMm.forEach((run) => positive(run, "longueur"));
  positive(input.heightMm, "hauteur");

  const lengthMm = input.runsMm.reduce((sum, run) => sum + run, 0);
  const wallAreaCm2 = Math.round((lengthMm * input.heightMm) / 100);
  const facesCm2 = wallAreaCm2 * sides * perFace;
  const boardAreaCm2 = Math.round((facesCm2 * r.boardFactorPermille) / 1000);
  const boards = ceilDiv(boardAreaCm2, (boardW * boardH) / 100);
  const railMm = 2 * lengthMm;
  const rails = ceilDiv(railMm, railLength);
  const studs = input.runsMm.reduce((sum, run) => sum + ceilDiv(run, r.studSpacingMm) + 1, 0);
  const studLengthMm = STUD_LENGTHS_MM.find((l) => l >= input.heightMm - 10) ?? null;
  // Les ratios valent pour une cloison (deux faces) : un doublage en prend la moitié. Vis : ratio
  // sourcé pour un parement simple seulement ; joints : sur la plaque de finition seulement.
  const share = sides / 2;
  const screws =
    perFace === 1 ? Math.ceil((wallAreaCm2 * r.screwsPerM2 * share) / 10_000 - 1e-9) : null;
  const tapeMm = Math.round((wallAreaCm2 * r.tapeMmPerM2 * share) / 10_000);
  const compoundG = Math.round((wallAreaCm2 * r.compoundGPerM2 * share) / 10_000);
  const packs = {
    screwBoxes: screws === null ? null : ceilDiv(screws, input.screwsPerBox ?? 1000),
    tapeRolls: ceilDiv(tapeMm, input.tapeRollMm ?? 150_000),
    compoundBags: ceilDiv(compoundG, input.compoundBagG ?? 25_000),
  };
  const steps: CalcStep[] = [
    {
      key: "surface",
      label: "Surface de cloison",
      formula: `${ml(lengthMm)} ml × ${ml(input.heightMm)} m`,
      value: wallAreaCm2 / 10_000,
      unit: "m²",
    },
    {
      key: "plaques",
      label: "Plaques",
      formula: `${m2(wallAreaCm2)} m² × ${sides} face${sides > 1 ? "s" : ""} × ${perFace} plaque${perFace > 1 ? "s" : ""} × 1,05 ÷ ${m2((boardW * boardH) / 100)} m²`,
      value: boards,
      unit: "u",
    },
    {
      key: "rails",
      label: "Rails",
      formula: `2 × ${ml(lengthMm)} ml ÷ ${ml(railLength)} m`,
      value: rails,
      unit: "u",
    },
    {
      key: "montants",
      label: "Montants",
      formula: `entraxe ${ml(r.studSpacingMm)} m + 1 par cloison`,
      value: studs,
      unit: "u",
    },
    ...(screws === null
      ? []
      : [
          {
            key: "vis",
            label: "Vis TTPC 25",
            formula: `${m2(wallAreaCm2)} m² × ${r.screwsPerM2 * share} par m²`,
            value: screws,
            unit: "u",
          },
        ]),
    {
      key: "bande",
      label: "Bande à joint",
      formula: `${m2(wallAreaCm2)} m² × ${ml(r.tapeMmPerM2 * share)} ml par m²`,
      value: tapeMm / 1000,
      unit: "ml",
    },
    {
      key: "enduit",
      label: "Enduit à joint",
      formula: `${m2(wallAreaCm2)} m² × ${(r.compoundGPerM2 * share) / 1000} kg par m²`,
      value: compoundG / 1000,
      unit: "kg",
    },
  ];
  return {
    lengthMm,
    wallAreaCm2,
    boardAreaCm2,
    boards,
    railMm,
    rails,
    studs,
    studLengthMm,
    screws,
    tapeMm,
    compoundG,
    packs,
    steps,
    source: r.source,
  };
}

export function ceilingTakeoff(input: {
  areaCm2: number;
  perimeterMm?: number | null;
  boardWidthMm?: number;
  boardHeightMm?: number;
  furringLengthMm?: number;
  angleLengthMm?: number;
}) {
  const r = MATERIAL_RATIOS.ceiling;
  positive(input.areaCm2, "surface");
  const boardW = input.boardWidthMm ?? 1200;
  const boardH = input.boardHeightMm ?? 2500;
  const boardAreaCm2 = Math.round((input.areaCm2 * r.boardFactorPermille) / 1000);
  const boards = ceilDiv(boardAreaCm2, (boardW * boardH) / 100);
  const furringMm = Math.round((input.areaCm2 * r.furringMmPerM2) / 10_000);
  const furrings = ceilDiv(furringMm, input.furringLengthMm ?? 3000);
  // Une suspente par maille de 1,20 m (sur la fourrure) × 0,50 m (entre fourrures).
  const hangers = ceilDiv(input.areaCm2, (r.hangerSpacingMm * r.furringSpacingMm) / 100);
  const angles = input.perimeterMm ? ceilDiv(input.perimeterMm, input.angleLengthMm ?? 3000) : null;
  const steps: CalcStep[] = [
    {
      key: "plaques",
      label: "Plaques",
      formula: `${m2(input.areaCm2)} m² × 1,05 ÷ ${m2((boardW * boardH) / 100)} m²`,
      value: boards,
      unit: "u",
    },
    {
      key: "fourrures",
      label: "Fourrures",
      formula: `${m2(input.areaCm2)} m² × ${ml(r.furringMmPerM2)} ml par m²`,
      value: furrings,
      unit: "u",
    },
    {
      key: "suspentes",
      label: "Suspentes",
      formula: `${m2(input.areaCm2)} m² ÷ (1,20 × 0,50 m)`,
      value: hangers,
      unit: "u",
    },
    ...(angles === null
      ? []
      : [
          {
            key: "cornieres",
            label: "Cornières",
            formula: `${ml(input.perimeterMm ?? 0)} ml de périmètre`,
            value: angles,
            unit: "u",
          },
        ]),
  ];
  return { boardAreaCm2, boards, furringMm, furrings, hangers, angles, steps, source: r.source };
}

export type PaintRoom = {
  name: string;
  perimeterMm: number;
  heightMm: number;
  areaCm2: number;
  doors: number;
  windows: number;
};

/**
 * Peinture : murs (périmètre × hauteur) moins les ouvertures, plafonds au choix. Les dimensions
 * des ouvertures et le rendement du produit viennent de l'artisan ou de sa bibliothèque ; sans
 * rendement, pas de litres.
 */
export function paintTakeoff(input: {
  rooms: readonly PaintRoom[];
  door?: { widthMm: number; heightMm: number } | null;
  window?: { widthMm: number; heightMm: number } | null;
  ceilings: boolean;
  coats: number;
  coverageM2PerLitreMilli: number | null;
}) {
  const doorCm2 = input.door ? Math.round((input.door.widthMm * input.door.heightMm) / 100) : 0;
  const windowCm2 = input.window
    ? Math.round((input.window.widthMm * input.window.heightMm) / 100)
    : 0;
  const rooms = input.rooms.map((room) => {
    const grossCm2 = Math.round((room.perimeterMm * room.heightMm) / 100);
    const wallsCm2 = Math.max(0, grossCm2 - room.doors * doorCm2 - room.windows * windowCm2);
    return { name: room.name, grossCm2, wallsCm2, ceilingCm2: input.ceilings ? room.areaCm2 : 0 };
  });
  const wallsCm2 = rooms.reduce((sum, x) => sum + x.wallsCm2, 0);
  const ceilingsCm2 = rooms.reduce((sum, x) => sum + x.ceilingCm2, 0);
  const totalCm2 = wallsCm2 + ceilingsCm2;
  const litresMilli = input.coverageM2PerLitreMilli
    ? Math.ceil((totalCm2 * input.coats * 100) / input.coverageM2PerLitreMilli - 1e-9)
    : null;
  return { rooms, wallsCm2, ceilingsCm2, totalCm2, litresMilli };
}

export function tileTakeoff(input: {
  areaCm2: number;
  wastePercent: number;
  tileWidthMm: number;
  tileHeightMm: number;
  boxAreaCm2?: number | null;
}) {
  positive(input.areaCm2, "surface");
  const areaWithWasteCm2 = Math.round((input.areaCm2 * (100 + input.wastePercent)) / 100);
  const tiles = ceilDiv(areaWithWasteCm2, (input.tileWidthMm * input.tileHeightMm) / 100);
  const boxes = input.boxAreaCm2 ? ceilDiv(areaWithWasteCm2, input.boxAreaCm2) : null;
  return { areaWithWasteCm2, tiles, boxes };
}

/** Plinthes : périmètre de la pièce moins la largeur des portes. */
export function skirtingTakeoff(input: { perimeterMm: number; doorWidthsMm: readonly number[] }) {
  const doors = input.doorWidthsMm.reduce((sum, w) => sum + w, 0);
  return { lengthMm: Math.max(0, input.perimeterMm - doors) };
}

export type SupplyToPrice = {
  label: string;
  /** Quantité entière (plaques, rails…) ou en millièmes (kg, ml…). */
  quantity?: number;
  quantityMilli?: number;
  unitPriceCents: number | null;
};

// Même calcul que `lineCostCents` (library.ts), recopié : ce fichier reste sans import, lisible
// tel quel par la fonction serveur du chat (Deno).
const lineCostCents = (unitCents: number | null, quantityMilli: number) =>
  unitCents === null ? null : Math.round((unitCents * quantityMilli) / 1000);

/** Fournitures chiffrées avec les prix de la bibliothèque (centimes entiers). */
export function priceSupplies(lines: readonly SupplyToPrice[]) {
  const priced = lines.map((line) => {
    const milli = line.quantityMilli ?? (line.quantity ?? 0) * 1000;
    return { ...line, quantityMilli: milli, totalCents: lineCostCents(line.unitPriceCents, milli) };
  });
  return {
    lines: priced,
    totalCents: priced.reduce((sum, l) => sum + (l.totalCents ?? 0), 0),
    missing: priced.filter((l) => l.totalCents === null).map((l) => l.label),
  };
}
