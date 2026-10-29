import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_ZOOM,
  centeredFraming,
  clampFraming,
  edgeColor,
  fillScale,
  fitScale,
  initialFraming,
  rescaleFraming,
  zoomFraming,
} from "../src/avatar-framing";

describe("cadrage de la photo de profil (ADR 0202)", () => {
  it("logo allongé : image entière dans le rond, centrée, au départ", () => {
    // Logo 512 × 288 dans un carré de 300 : sa diagonale égale le diamètre du rond.
    const f = initialFraming(512, 288, 300);
    expect(f.scale).toBeCloseTo(300 / Math.hypot(512, 288));
    expect(Math.hypot(512 * f.scale, 288 * f.scale)).toBeCloseTo(300);
    expect(f.x).toBeCloseTo((300 - 512 * f.scale) / 2);
    expect(f.y).toBeCloseTo((300 - 288 * f.scale) / 2);
  });

  it("photo presque carrée ou portrait 3:4 : carré rempli au départ", () => {
    const portrait = initialFraming(600, 800, 300);
    expect(portrait.scale).toBeCloseTo(fillScale(600, 800, 300));
    expect(portrait.x).toBeCloseTo(0);
    expect(portrait.y).toBeCloseTo((300 - 800 * portrait.scale) / 2);
  });

  it("zoom gardé entre « image entière » et 4 × « remplir »", () => {
    expect(clampFraming({ scale: 0.01, x: 0, y: 0 }, 400, 200, 100).scale).toBeCloseTo(
      fitScale(400, 200, 100),
    );
    expect(clampFraming({ scale: 99, x: 0, y: 0 }, 400, 200, 100).scale).toBeCloseTo(
      0.5 * AVATAR_MAX_ZOOM,
    );
  });

  it("image plus grande : pas de vide ; plus petite : reste dans le carré", () => {
    const big = clampFraming({ scale: 1, x: 50, y: -500 }, 200, 200, 100);
    expect(big).toEqual({ scale: 1, x: 0, y: -100 });
    const small = clampFraming({ scale: 0.2, x: -20, y: 90 }, 400, 200, 100);
    expect(small.scale).toBeCloseTo(fitScale(400, 200, 100));
    expect(small.x).toBeCloseTo(0);
    expect(small.y).toBeCloseTo(100 - 200 * small.scale);
  });

  it("zoom autour du centre, puis même cadrage à une autre taille", () => {
    const start = centeredFraming(fillScale(200, 200, 100), 200, 200, 100);
    const zoomed = zoomFraming(start, 1, 200, 200, 100);
    expect(zoomed).toEqual({ scale: 1, x: -50, y: -50 });
    expect(rescaleFraming(zoomed, 100, 512)).toEqual({ scale: 5.12, x: -256, y: -256 });
  });

  it("fond : moyenne du bord, transparent compté comme blanc", () => {
    const black = new Uint8ClampedArray(3 * 3 * 4).map((_, i) => (i % 4 === 3 ? 255 : 0));
    expect(edgeColor(black, 3, 3)).toBe("#000000");
    expect(edgeColor(new Uint8ClampedArray(2 * 2 * 4), 2, 2)).toBe("#ffffff");
  });
});
