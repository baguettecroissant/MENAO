import { describe, expect, it } from "vitest";
import {
  buildPlanTrace,
  estimatesFromTraces,
  jpegSize,
  traceable,
  traceControl,
  traceForRoom,
  measureContour,
  measureGapBp,
  parseContour,
  planScaleFromAnchors,
  polygonAreaPx,
  polygonPerimeterPx,
} from "../src/plan-measure";

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

describe("parseContour", () => {
  it("lit un contour « x,y x,y … » en pixels", () => {
    expect(parseContour("10,20 110,20 110.5,80 10,80", 200, 100)).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110.5, y: 80 },
      { x: 10, y: 80 },
    ]);
  });
  it("refuse un contour mal écrit, trop court, trop long ou hors de l'image", () => {
    expect(parseContour("10,20 110,20", 200, 100)).toBeNull();
    expect(parseContour("10;20 110;20 110;80", 200, 100)).toBeNull();
    expect(parseContour("10,20 110,20 900,80", 200, 100)).toBeNull();
    expect(
      parseContour(Array.from({ length: 41 }, (_, i) => `${i},${i}`).join(" "), 200, 100),
    ).toBeNull();
    expect(parseContour(null, 200, 100)).toBeNull();
  });
});

describe("aire et périmètre", () => {
  it("mesure un rectangle et une pièce en L, quel que soit le sens du tracé", () => {
    expect(polygonAreaPx(rect(0, 0, 100, 50))).toBe(5000);
    expect(polygonPerimeterPx(rect(0, 0, 100, 50))).toBe(300);
    const l = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 60, y: 40 },
      { x: 60, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(polygonAreaPx(l)).toBe(7600);
    expect(polygonAreaPx([...l].reverse())).toBe(7600);
    expect(polygonPerimeterPx(l)).toBe(400);
  });
});

describe("planScaleFromAnchors", () => {
  const anchor = (px: number, mm: number) => ({ a: { x: 0, y: 0 }, b: { x: px, y: 0 }, mm });
  it("cale l'échelle sur la médiane des cotes désignées", () => {
    // 359 cm sur 500 px, 361 cm sur 503 px, 349 cm sur 485 px : 7,18 / 7,177 / 7,196 mm par pixel.
    const scale = planScaleFromAnchors([anchor(500, 3590), anchor(503, 3610), anchor(485, 3490)]);
    expect(scale?.anchors).toBe(3);
    expect(scale?.mmPerPx).toBeCloseTo(7.18, 2);
    expect(scale?.spreadBp).toBeLessThan(50);
  });
  it("écarte une cote trop courte ou hors bornes", () => {
    expect(planScaleFromAnchors([anchor(10, 100), anchor(500, 3590)])?.anchors).toBe(1);
    expect(planScaleFromAnchors([anchor(500, 20)])).toBeNull();
    expect(planScaleFromAnchors([])).toBeNull();
  });
  it("ne mesure rien quand les cotes se contredisent de plus de 5 %", () => {
    expect(planScaleFromAnchors([anchor(500, 3590), anchor(500, 4200)])).toBeNull();
  });
});

describe("measureContour", () => {
  it("donne la surface en cm² et le périmètre en mm à l'échelle calée", () => {
    // 1 px = 10 mm : un rectangle de 359 × 317 px fait 3,59 × 3,17 m.
    expect(measureContour(rect(40, 40, 359, 317), { mmPerPx: 10 })).toEqual({
      areaCm2: 113_803,
      perimeterMm: 13_520,
    });
    expect(measureContour(rect(0, 0, 0, 0), { mmPerPx: 10 })).toBeNull();
    expect(measureContour([{ x: 0, y: 0 }], { mmPerPx: 10 })).toBeNull();
  });
  it("chiffre l'écart avec une mesure de référence", () => {
    expect(measureGapBp(115_200, 113_800)).toBe(123);
    expect(measureGapBp(100, 0)).toBeNull();
  });
});

describe("tracé d'un plan", () => {
  // 1 px = 10 mm : chambre de 359 × 317 px, pièce en L, cotes de 359 et 317 cm.
  const raw = {
    cotes: [
      { x1: 40, y1: 40, x2: 399, y2: 40, valeur_cm: 359 },
      { x1: 40, y1: 40, x2: 40, y2: 357, valeur_cm: 317 },
      { x1: 0, y1: 0, x2: 5, y2: 0, valeur_cm: 400 },
    ],
    pieces: [
      { nom: "Chambre 1", contour: "40,40 399,40 399,357 40,357" },
      { nom: "Salle d'eau", contour: "420,40 650,40 650,200 570,200 570,340 420,340" },
      { nom: "Trait", contour: "0,0 10,10" },
      { nom: "Poussière", contour: "0,0 3,0 3,3 0,3" },
    ],
  };
  const built = buildPlanTrace(raw, 3, 2000, 1500);
  if (!built) throw new Error("tracé attendu");
  const trace = built;
  const [first] = trace.rooms;
  if (!first) throw new Error("pièce attendue");
  const [long, short] = raw.cotes;

  it("cale l'échelle, mesure chaque contour et écarte ce qui est douteux", () => {
    expect(trace).toMatchObject({
      file: 3,
      width: 2000,
      height: 1500,
      umPerPx: 10_000,
      spreadBp: 0,
    });
    expect(trace.anchors).toHaveLength(2);
    expect(trace.rooms.map((r) => [r.name, r.areaCm2, r.perimeterMm])).toEqual([
      ["Chambre 1", 113_803, 13_520],
      ["Salle d'eau", 57_800, 10_600],
    ]);
  });

  it("n'estime rien sans échelle sûre, sans contour, ou sur une image que le modèle réduirait", () => {
    expect(buildPlanTrace({ ...raw, cotes: [] }, 1, 2000, 1500)).toBeNull();
    expect(
      buildPlanTrace(
        {
          ...raw,
          cotes: [
            ...(long ? [long] : []),
            { ...short, x1: 40, y1: 40, x2: 40, y2: 357, valeur_cm: 400 },
          ],
        },
        1,
        2000,
        1500,
      ),
    ).toBeNull();
    expect(buildPlanTrace({ ...raw, pieces: [] }, 1, 2000, 1500)).toBeNull();
    expect(buildPlanTrace(raw, 1, 2400, 1800)).toBeNull();
    expect(traceable(2000, 1500)).toBe(true);
    expect(traceable(2400, 1800)).toBe(false);
    expect(traceable(3000, 1000)).toBe(false);
  });

  const rooms = [
    { name: "chambre 1", file: 3, areaCm2: 113_800, source: "cotes" },
    { name: "Salle d’eau", file: 2, areaCm2: null, source: "photo" },
    { name: "Salon", file: 3, areaCm2: null, source: "photo" },
  ];
  it("retrouve une pièce par son nom, de préférence sur son propre plan", () => {
    const other = { ...trace, file: 2, rooms: [{ ...first, areaCm2: 1 }] };
    expect(traceForRoom([other, trace], { name: "chambre 1", file: 3 })?.areaCm2).toBe(113_803);
    expect(traceForRoom([trace], { name: "Salon", file: 3 })).toBeNull();
  });
  it("n'estime que les pièces sans surface et contrôle les autres", () => {
    expect(estimatesFromTraces(rooms, [trace])).toEqual([
      { position: 2, areaCm2: 57_800, perimeterMm: 10_600 },
    ]);
    expect(traceControl(rooms, [trace])).toEqual([
      { name: "chambre 1", areaCm2: 113_800, tracedCm2: 113_803, gapBp: 0 },
    ]);
  });
});

describe("jpegSize", () => {
  it("lit les dimensions dans l'en-tête", () => {
    const header = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
    const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, 0x05, 0xdc, 0x07, 0xd0, 0x03, 0, 0, 0];
    expect(jpegSize(new Uint8Array([...header, ...sof]))).toEqual({ width: 2000, height: 1500 });
    expect(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(jpegSize(new Uint8Array(header))).toBeNull();
  });
});
