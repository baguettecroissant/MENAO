import { describe, expect, it } from "vitest";
import { SPOT_CHECK_RATE, spotCheckPeriod, spotCheckTarget } from "../src/spot-check";

describe("contrôle aléatoire des dossiers (ADR 0121)", () => {
  it("5 % des artisans validés, arrondis au supérieur", () => {
    expect(SPOT_CHECK_RATE).toBe(0.05);
    expect(spotCheckTarget(0)).toBe(0);
    expect(spotCheckTarget(1)).toBe(1);
    expect(spotCheckTarget(20)).toBe(1);
    expect(spotCheckTarget(21)).toBe(2);
    expect(spotCheckTarget(2000)).toBe(100);
  });

  it("mois du contrôle", () => {
    expect(spotCheckPeriod("2026-10-18")).toBe("2026-10-01");
  });
});
