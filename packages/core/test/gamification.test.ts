import { describe, expect, it } from "vitest";
import { claimableReward, levelProgress, nextReward, type GradeLevel } from "../src/gamification";

// Valeurs par défaut des maquettes (niveau 5 à 1 000 XP).
const levels: GradeLevel[] = [
  { level: 1, xpMin: 0, reward: null, rewardDetail: null },
  { level: 2, xpMin: 150, reward: null, rewardDetail: null },
  { level: 3, xpMin: 350, reward: null, rewardDetail: null },
  { level: 4, xpMin: 600, reward: null, rewardDetail: null },
  {
    level: 5,
    xpMin: 1000,
    reward: "Ensemble de chantier MENAO",
    rewardDetail: "Veste et pantalon",
  },
];

describe("gamification (F-24)", () => {
  it("niveau et avancement vers le suivant (maquette : 850 / 1 000 XP, niv. 4 vers niv. 5)", () => {
    const p = levelProgress(levels, 850);
    expect(p.current?.level).toBe(4);
    expect(p.next?.level).toBe(5);
    expect(p.progress).toBeCloseTo(250 / 400);
  });

  it("début et dernier niveau", () => {
    expect(levelProgress(levels, 0)).toMatchObject({
      current: { level: 1 },
      next: { level: 2 },
      progress: 0,
    });
    expect(levelProgress(levels, 1200)).toMatchObject({
      current: { level: 5 },
      next: null,
      progress: 1,
    });
  });

  it("prochaine récompense et récompense à réclamer", () => {
    expect(nextReward(levels, 4)?.level).toBe(5);
    expect(nextReward(levels, 5)).toBeNull();
    expect(claimableReward(levels, 4, [])).toBeNull();
    expect(claimableReward(levels, 5, [])?.reward).toBe("Ensemble de chantier MENAO");
    expect(claimableReward(levels, 5, [5])).toBeNull();
  });
});
