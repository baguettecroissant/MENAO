import { describe, expect, it } from "vitest";
import {
  CHARTER_RULES,
  CHARTER_RULE_COUNT,
  CHARTER_SCORE_WEIGHTS,
  CHARTER_SECTIONS,
  CHARTER_VERSION,
  charterChecklistComplete,
  charterRule,
} from "../src/charter";

describe("charte qualité de l'artisan", () => {
  it("version V5, 6 sections et 25 règles", () => {
    expect(CHARTER_VERSION).toBe("V5");
    expect(CHARTER_SECTIONS).toHaveLength(6);
    expect(CHARTER_RULE_COUNT).toBe(25);
    expect(CHARTER_RULES).toHaveLength(25);
  });

  it("numérote les règles R<section>.<rang>, sans doublon, de R1.1 à R6.2", () => {
    const codes = CHARTER_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes[0]).toBe("R1.1");
    expect(codes.at(-1)).toBe("R6.2");
    expect(codes).toContain("R4.3");
    expect(charterRule("R1.1")?.title).toBe("J’envoie mon devis dans les 72 h");
    expect(charterRule("R9.9")).toBeUndefined();
  });

  it("les poids du score totalisent 100 %", () => {
    expect(CHARTER_SCORE_WEIGHTS.reduce((s, w) => s + w.weight, 0)).toBe(100);
    expect(CHARTER_SCORE_WEIGHTS[0]).toMatchObject({ key: "notes", weight: 40 });
  });

  it("la liste n'est complète que si les 25 règles sont cochées", () => {
    const all = CHARTER_RULES.map((r) => r.code);
    expect(charterChecklistComplete(all)).toBe(true);
    expect(charterChecklistComplete(all.slice(1))).toBe(false);
    expect(charterChecklistComplete([...all.slice(1), "R9.9"])).toBe(false);
  });
});
