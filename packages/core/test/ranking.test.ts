import { describe, expect, it } from "vitest";
import {
  RANKING_PRIOR,
  charterScore,
  planningFreshness,
  seniorityAndBadges,
  smoothedAverage,
  smoothedRate,
} from "../src/ranking";

describe("score MENAO de la charte (classement)", () => {
  it("un taux sans historique vaut la valeur neutre, puis tend vers la réalité", () => {
    expect(smoothedRate(0, 0)).toBeCloseTo(RANKING_PRIOR.rate * 100, 6);
    expect(smoothedRate(3, 3)).toBeCloseTo(85, 6);
    expect(smoothedRate(0, 3)).toBeCloseTo(35, 6);
    expect(smoothedRate(97, 100)).toBeCloseTo(96.21, 2);
  });

  it("la moyenne des avis est lissée de la même façon", () => {
    expect(smoothedAverage(null, 0)).toBe(RANKING_PRIOR.average);
    expect(smoothedAverage(100, 3)).toBe(85);
    expect(smoothedAverage(40, 3)).toBe(55);
  });

  it("le planning compte plein jusqu'à 7 jours, puis rien à 28 jours", () => {
    expect(planningFreshness(0)).toBe(100);
    expect(planningFreshness(7)).toBe(100);
    expect(planningFreshness(17.5)).toBeCloseTo(50, 6);
    expect(planningFreshness(28)).toBe(0);
    expect(planningFreshness(90)).toBe(0);
    expect(planningFreshness(null)).toBe(0);
  });

  it("ancienneté (24 mois pour le maximum) et badges obtenus, à parts égales", () => {
    expect(seniorityAndBadges(0, 0, 10)).toBe(0);
    expect(seniorityAndBadges(12, 5, 10)).toBeCloseTo(50, 6);
    expect(seniorityAndBadges(36, 10, 10)).toBe(100);
    expect(seniorityAndBadges(24, 0, 0)).toBe(50);
  });

  it("applique les poids de la charte (40, 20, 15, 10, 10, 5)", () => {
    const all = (v: number) => ({
      notes: v,
      delai72h: v,
      reactivite: v,
      planning: v,
      chantiersTermines: v,
      anciennete: v,
    });
    expect(charterScore(all(100))).toBe(100);
    expect(charterScore(all(0))).toBe(0);
    expect(charterScore({ ...all(0), notes: 100 })).toBe(40);
    expect(charterScore({ ...all(0), delai72h: 100, anciennete: 100 })).toBe(25);
    expect(charterScore({ ...all(70), planning: 0 })).toBe(63);
  });
});
