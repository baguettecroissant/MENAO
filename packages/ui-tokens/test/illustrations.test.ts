import { describe, expect, it } from "vitest";
import { ILLUSTRATIONS, ILLUSTRATION_VIEWBOX } from "../src/illustrations";

const TONES = new Set(["soft", "card", "line", "accent", "inverse"]);

describe("illustrations des états vides", () => {
  it.each(Object.entries(ILLUSTRATIONS))("%s : disque de fond puis formes valides", (_, shapes) => {
    expect(shapes[0]?.tone).toBe("soft");
    for (const shape of shapes) {
      expect(TONES.has(shape.tone)).toBe(true);
      expect(shape.d).toMatch(/^M[\d.]/);
      // Coordonnées absolues dans le cadre du viewBox.
      for (const [, x, y] of shape.d.matchAll(/[ML]([\d.]+)[ ,]([\d.]+)/g)) {
        expect(Number(x)).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX.width);
        expect(Number(y)).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX.height);
      }
    }
  });
});
