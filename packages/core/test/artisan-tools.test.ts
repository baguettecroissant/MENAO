import { describe, expect, it } from "vitest";
import { charterProgress, progressRatio } from "../src/artisan-tools";
import { CHARTER_RULES, CHARTER_RULE_COUNT, CHARTER_SECTIONS } from "../src/charter";

describe("outils de l'artisan (refonte « Nette », lot 8)", () => {
  describe("progressRatio", () => {
    it("donne la part atteinte entre 0 et 1", () => {
      expect(progressRatio(3, 5)).toBe(0.6);
      expect(progressRatio(0, 5)).toBe(0);
      expect(progressRatio(5, 5)).toBe(1);
    });

    it("plafonne à 1 et ne descend pas sous 0", () => {
      expect(progressRatio(8, 5)).toBe(1);
      expect(progressRatio(-2, 5)).toBe(0);
    });

    it("vaut 0 sans cible ou avec une valeur invalide", () => {
      expect(progressRatio(3, 0)).toBe(0);
      expect(progressRatio(3, -1)).toBe(0);
      expect(progressRatio(Number.NaN, 5)).toBe(0);
    });
  });

  describe("charterProgress", () => {
    it("ne compte rien quand rien n'est coché", () => {
      const progress = charterProgress({});
      expect(progress.done).toBe(0);
      expect(progress.total).toBe(CHARTER_RULE_COUNT);
      expect(progress.percent).toBe(0);
      expect(progress.sections).toHaveLength(CHARTER_SECTIONS.length);
      expect(progress.sections.every((s) => s.done === 0)).toBe(true);
    });

    it("compte les règles cochées, au total et par partie", () => {
      const progress = charterProgress({ "R1.1": true, "R1.2": true, "R2.1": true, "R1.3": false });
      expect(progress.done).toBe(3);
      expect(progress.sections[0]?.done).toBe(2);
      expect(progress.sections[1]?.done).toBe(1);
      expect(progress.sections[0]?.total).toBe(CHARTER_SECTIONS[0]?.rules.length);
    });

    it("ignore les codes inconnus", () => {
      expect(charterProgress({ "R99.1": true, autre: true }).done).toBe(0);
    });

    it("arrondit à l'inférieur : 100 % seulement quand tout est coché", () => {
      const all = Object.fromEntries(CHARTER_RULES.map((r) => [r.code, true]));
      expect(charterProgress(all)).toMatchObject({ done: CHARTER_RULE_COUNT, percent: 100 });
      const allButOne = { ...all, [CHARTER_RULES[0]?.code ?? ""]: false };
      expect(charterProgress(allButOne).percent).toBeLessThan(100);
    });
  });
});
