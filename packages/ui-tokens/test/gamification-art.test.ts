import { describe, expect, it } from "vitest";
import { BADGE_STYLES, OUTFIT, OUTFIT_VIEWBOX, badgeStyle } from "../src/gamification-art";

describe("badges MENAO", () => {
  it("bleu une fois obtenu, doré pour « Main d'or », gris à obtenir", () => {
    expect(badgeStyle("artisan_exceptionnel", true)).toBe("obtenu");
    expect(badgeStyle("main_d_or", true)).toBe("or");
    expect(badgeStyle("main_d_or", false)).toBe("a_obtenir");
    expect(badgeStyle("badge_ajoute_en_base", false)).toBe("a_obtenir");
  });

  it("couleurs hexadécimales ou rgba pour chaque teinte", () => {
    for (const style of Object.values(BADGE_STYLES)) {
      for (const color of [...style.ring, ...style.face, style.icon, style.iconFill]) {
        expect(color).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/);
      }
      expect(style.shine).toBeGreaterThan(0);
      expect(style.shine).toBeLessThanOrEqual(1);
    }
  });
});

describe("illustration de la tenue", () => {
  it("formes visibles, dans le cadre", () => {
    for (const shape of OUTFIT) {
      expect(shape.fill ?? shape.stroke).toBeTruthy();
      for (const [, x, y] of shape.d.matchAll(/^M([\d.]+)[ ,]([\d.]+)/g)) {
        expect(Number(x)).toBeLessThanOrEqual(OUTFIT_VIEWBOX.width);
        expect(Number(y)).toBeLessThanOrEqual(OUTFIT_VIEWBOX.height);
      }
    }
  });
});
