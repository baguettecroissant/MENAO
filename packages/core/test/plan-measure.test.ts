import { describe, expect, it } from "vitest";
import {
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
