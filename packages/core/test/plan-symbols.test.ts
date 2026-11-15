import { describe, expect, it } from "vitest";
import {
  ELECTRICAL_SYMBOLS,
  imageSize,
  mergeSymbolReadings,
  normalizeSymbols,
  symbolCounts,
  symbolsInRooms,
  symbolsJsonSchema,
  type PlanSymbol,
} from "../src/plan-symbols";

const raw = (...symboles: { type: string; x: number; y: number; piece?: string }[]) => ({
  legende: ["demi-cercle rouge = prise"],
  symboles: symboles.map((s) => ({ piece: "", ...s })),
});

describe("normalizeSymbols", () => {
  it("garde les types connus dans l'image, ramène une zone agrandie au plan", () => {
    expect(
      normalizeSymbols(
        raw(
          { type: "prise", x: 10, y: 20, piece: " salon " },
          { type: "licorne", x: 5, y: 5 },
          { type: "spot", x: 3000, y: 5 },
        ),
        2000,
        1500,
      ),
    ).toEqual([{ type: "prise", x: 10, y: 20, room: "salon" }]);
    // Zone agrandie × 2, décalée de (900, 680) dans le plan.
    expect(
      normalizeSymbols(raw({ type: "spot", x: 200, y: 100 }), 2200, 1640, {
        x: 900,
        y: 680,
        scale: 2,
      }),
    ).toEqual([{ type: "spot", x: 1000, y: 730, room: null }]);
  });

  it("supporte une réponse abîmée", () => {
    expect(normalizeSymbols({} as never, 100, 100)).toEqual([]);
    expect(normalizeSymbols({ symboles: [null, { type: "prise" }] } as never, 100, 100)).toEqual(
      [],
    );
  });
});

describe("mergeSymbolReadings", () => {
  const at = (type: string, x: number, y: number) => ({ type, x, y, room: null }) as never;

  it("prend le type de la lecture entière et le nombre de la lecture la plus fine", () => {
    const full = [
      at("spot", 100, 100),
      at("point_lumineux", 500, 500),
      at("interrupteur", 730, 940),
      at("prise", 300, 300),
    ];
    const zones = [
      // Le spot vu comme un point lumineux dans la zone agrandie : même symbole.
      at("point_lumineux", 102, 99),
      at("point_lumineux", 501, 502),
      // Deux interrupteurs serrés là où la lecture entière n'en voit qu'un.
      at("interrupteur", 728, 930),
      at("interrupteur", 728, 952),
      // Un symbole que la lecture entière n'a pas vu.
      at("prise", 1200, 900),
    ];
    const merged = mergeSymbolReadings(full, zones, 2000, 1500);
    const count = (t: string) => merged.filter((s) => s.type === t).length;
    expect(count("spot")).toBe(1);
    expect(count("point_lumineux")).toBe(1);
    expect(count("interrupteur")).toBe(2);
    expect(count("prise")).toBe(2);
    // Les deux lectures ne s'accordent pas sur le groupe d'interrupteurs : à vérifier.
    expect(merged.filter((s) => s.doubt).map((s) => s.type)).toEqual([
      "interrupteur",
      "interrupteur",
    ]);
  });

  it("sans zones, rend la lecture entière dédoublonnée", () => {
    const merged = mergeSymbolReadings(
      [at("prise", 10, 10), at("prise", 12, 11), at("prise", 60, 10)],
      [],
      2000,
      1500,
    );
    expect(merged.map((s) => [s.x, s.doubt])).toEqual([
      [10, false],
      [60, false],
    ]);
  });
});

describe("symbolsInRooms et symbolCounts", () => {
  const trace = {
    file: 1,
    page: 1,
    width: 1000,
    height: 800,
    umPerPx: 10_000,
    spreadBp: 0,
    anchors: [],
    rooms: [
      { name: "Salon", contour: "0,0 500,0 500,400 0,400", areaCm2: 200_000, perimeterMm: 18_000 },
      {
        name: "Cuisine",
        contour: "500,0 1000,0 1000,400 500,400",
        areaCm2: 200_000,
        perimeterMm: 18_000,
      },
    ],
  };
  const symbols: PlanSymbol[] = [
    { file: 1, page: 1, type: "prise", x: 100, y: 100, room: null, doubt: false },
    { file: 1, page: 1, type: "prise", x: 600, y: 100, room: "salon", doubt: false },
    { file: 1, page: 1, type: "interrupteur", x: 700, y: 300, room: null, doubt: true },
    { file: 1, page: 1, type: "prise", x: 100, y: 700, room: "garage", doubt: false },
    { file: 2, page: 1, type: "spot", x: 100, y: 100, room: null, doubt: false },
  ];

  it("rattache un symbole à la pièce dont il est dans le contour, sinon à la pièce lue", () => {
    expect(symbolsInRooms(symbols, [trace]).map((s) => s.room)).toEqual([
      "Salon",
      "Cuisine",
      "Cuisine",
      "garage",
      null,
    ]);
  });

  it("compte par type et par pièce, et dit si un type a un groupe à vérifier", () => {
    const counts = symbolCounts(symbolsInRooms(symbols, [trace]));
    expect(counts.prise).toEqual({
      total: 3,
      doubt: false,
      rooms: { Salon: 1, Cuisine: 1, garage: 1 },
    });
    expect(counts.interrupteur).toEqual({ total: 1, doubt: true, rooms: { Cuisine: 1 } });
    expect(counts.spot).toEqual({ total: 1, doubt: false, rooms: { "": 1 } });
  });
});

describe("outils", () => {
  it("lit les dimensions d'un JPEG et d'un PNG", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    png.set([0, 0, 0x03, 0x20, 0, 0, 0x02, 0x58], 16);
    expect(imageSize(png)).toEqual({ width: 800, height: 600 });
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x05, 0xdc, 0x07, 0xd0, 3, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(imageSize(jpeg)).toEqual({ width: 2000, height: 1500 });
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("schéma léger et liste des symboles électriques", () => {
    expect(JSON.stringify(symbolsJsonSchema()).match(/"null"/g)).toBeNull();
    expect(ELECTRICAL_SYMBOLS).toContain("interrupteur");
    expect(ELECTRICAL_SYMBOLS).not.toContain("porte");
  });
});
