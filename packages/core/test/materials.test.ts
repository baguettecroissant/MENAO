import { describe, expect, it } from "vitest";
import {
  MATERIAL_RATIOS,
  ceilingTakeoff,
  paintTakeoff,
  partitionTakeoff,
  priceSupplies,
  skirtingTakeoff,
  tileTakeoff,
} from "../src/materials";

describe("partitionTakeoff", () => {
  // Les 4 cloisons de la maquette du lot 59 : 7,58 + 7,58 + 3,00 + 3,62 = 21,78 ml, 2,50 m.
  const runs = [7580, 7580, 3000, 3620];

  it("cloison 72/48, une plaque par face : plaques, ossature, vis, bande, enduit", () => {
    const r = partitionTakeoff({ runsMm: runs, heightMm: 2500 });
    expect(r.lengthMm).toBe(21_780);
    expect(r.wallAreaCm2).toBe(544_500); // 54,45 m²
    expect(r.boardAreaCm2).toBe(1_143_450); // 108,90 m² × 1,05
    expect(r.boards).toBe(39); // plaques de 1,20 × 2,50 m = 3 m²
    expect(r.rails).toBe(15); // 43,56 ml en barres de 3 m
    expect(r.studs).toBe(42); // par cloison : entraxe 0,60 m + 1 montant de départ
    expect(r.studLengthMm).toBe(2500);
    expect(r.screws).toBe(1198); // 22 vis par m² de cloison
    expect(r.tapeMm).toBe(152_460); // 2,8 ml par m²
    expect(r.compoundG).toBe(32_670); // 0,6 kg par m²
    expect(r.packs).toEqual({ screwBoxes: 2, tapeRolls: 2, compoundBags: 2 });
    expect(r.steps.map((s) => s.key)).toContain("plaques");
    expect(r.source).toBe(MATERIAL_RATIOS.partition.source);
  });

  it("doublage (une seule face) : la moitié des plaques et des joints", () => {
    const r = partitionTakeoff({ runsMm: [4000], heightMm: 2500, sides: 1 });
    expect(r.wallAreaCm2).toBe(100_000);
    expect(r.boards).toBe(4); // 10 m² × 1,05 = 10,5 m² → 3,5 → 4
    expect(r.screws).toBe(110);
    expect(r.studs).toBe(8);
  });

  it("deux plaques par face : plaques doublées, vis non sourcées laissées vides", () => {
    const r = partitionTakeoff({ runsMm: [4000], heightMm: 2500, boardsPerFace: 2 });
    expect(r.boards).toBe(14); // 40 m² × 1,05 = 42 m²
    expect(r.screws).toBeNull();
  });

  it("montant plus long que la hauteur, refus des mesures impossibles", () => {
    expect(partitionTakeoff({ runsMm: [3000], heightMm: 2650 }).studLengthMm).toBe(2700);
    expect(() => partitionTakeoff({ runsMm: [], heightMm: 2500 })).toThrow();
    expect(() => partitionTakeoff({ runsMm: [3000], heightMm: 0 })).toThrow();
  });
});

describe("ceilingTakeoff", () => {
  it("plafond sur fourrures à 0,50 m : plaques, fourrures, suspentes, cornières", () => {
    const r = ceilingTakeoff({ areaCm2: 178_800, perimeterMm: 16_940 }); // salon 17,88 m²
    expect(r.boards).toBe(7); // 17,88 × 1,05 = 18,77 m² → 6,26 → 7
    expect(r.furringMm).toBe(39_336); // 2,2 ml par m²
    expect(r.furrings).toBe(14); // barres de 3 m
    expect(r.hangers).toBe(30); // une suspente pour 1,20 × 0,50 m
    expect(r.angles).toBe(6); // cornières de 3 m sur 16,94 ml
  });
});

describe("paintTakeoff", () => {
  it("murs moins les ouvertures données, plafonds, litres au rendement du produit", () => {
    const r = paintTakeoff({
      rooms: [
        {
          name: "Chambre 1",
          perimeterMm: 13_520,
          heightMm: 2500,
          areaCm2: 113_800,
          doors: 1,
          windows: 1,
        },
        { name: "WC", perimeterMm: 5_280, heightMm: 2500, areaCm2: 14_800, doors: 1, windows: 0 },
      ],
      door: { widthMm: 830, heightMm: 2040 },
      window: { widthMm: 1200, heightMm: 1250 },
      ceilings: true,
      coats: 2,
      coverageM2PerLitreMilli: 10_000,
    });
    // Chambre : 33,80 − 1,69 − 1,50 = 30,61 m² ; WC : 13,20 − 1,69 = 11,51 m².
    expect(r.rooms.map((x) => x.wallsCm2)).toEqual([306_068, 115_068]);
    expect(r.wallsCm2).toBe(421_136);
    expect(r.ceilingsCm2).toBe(128_600);
    expect(r.litresMilli).toBe(10_995); // 54,97 m² × 2 couches ÷ 10 m²/L
  });

  it("sans rendement connu : pas de litres", () => {
    const r = paintTakeoff({
      rooms: [
        { name: "WC", perimeterMm: 5_280, heightMm: 2500, areaCm2: 14_800, doors: 0, windows: 0 },
      ],
      ceilings: false,
      coats: 2,
      coverageM2PerLitreMilli: null,
    });
    expect(r.wallsCm2).toBe(132_000);
    expect(r.litresMilli).toBeNull();
  });
});

describe("tileTakeoff et skirtingTakeoff", () => {
  it("carrelage avec le pourcentage de chutes choisi, en carreaux et en cartons", () => {
    const r = tileTakeoff({
      areaCm2: 94_100,
      wastePercent: 10,
      tileWidthMm: 600,
      tileHeightMm: 600,
      boxAreaCm2: 14_400,
    });
    expect(r.areaWithWasteCm2).toBe(103_510);
    expect(r.tiles).toBe(29); // 10,35 m² ÷ 0,36 m²
    expect(r.boxes).toBe(8); // cartons de 1,44 m²
  });

  it("plinthes : périmètre moins les portes", () => {
    expect(skirtingTakeoff({ perimeterMm: 12_620, doorWidthsMm: [830, 830] })).toEqual({
      lengthMm: 10_960,
    });
    expect(skirtingTakeoff({ perimeterMm: 500, doorWidthsMm: [830] })).toEqual({ lengthMm: 0 });
  });
});

describe("priceSupplies", () => {
  it("chiffre des fournitures en centimes, quantité entière ou en millièmes", () => {
    const r = priceSupplies([
      { label: "Plaques BA13", quantity: 39, unitPriceCents: 790 },
      { label: "Enduit", quantityMilli: 32_670, unitPriceCents: 74 },
      { label: "Inconnu", quantity: 3, unitPriceCents: null },
    ]);
    expect(r.lines.map((l) => l.totalCents)).toEqual([30_810, 2_418, null]);
    expect(r.totalCents).toBe(33_228);
    expect(r.missing).toEqual(["Inconnu"]);
  });
});
