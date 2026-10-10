import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colors,
  contrastPairs,
  contrastRatio,
  fontFamily,
  minTouchTarget,
  radius,
  shadow,
} from "../src";

const css = readFileSync(new URL("../src/theme.css", import.meta.url), "utf8");

function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    // Prettier peut répartir une valeur longue sur plusieurs lignes.
    if (name && value) vars[name] = value.replace(/\s+/g, " ").trim();
  }
  return vars;
}

describe("contrastRatio", () => {
  it("noir sur blanc = 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
  it("couleur identique = 1:1", () => {
    expect(contrastRatio("#1d4ed8", "#1d4ed8")).toBe(1);
  });
});

describe("accessibilité (spec §5)", () => {
  it.each(contrastPairs)("%s sur %s respecte AA (≥ 4,5:1)", (text, background) => {
    expect(contrastRatio(colors[text], colors[background])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme.css reste aligné sur tokens.ts", () => {
  const vars = cssVariables();
  const expected: Record<string, string> = {
    ...Object.fromEntries(Object.entries(colors).map(([k, v]) => [`color-${k}`, v])),
    ...Object.fromEntries(Object.entries(radius).map(([k, v]) => [`radius-${k}`, v])),
    ...Object.fromEntries(Object.entries(shadow).map(([k, v]) => [`shadow-${k}`, v])),
    "font-sans": fontFamily.sans,
    "spacing-touch": minTouchTarget,
  };

  it("mêmes variables, mêmes valeurs", () => {
    expect(vars).toEqual(expected);
  });
});
