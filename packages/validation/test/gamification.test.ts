import { describe, expect, it } from "vitest";
import { parseGrade, rewardClaimSchema } from "../src/gamification";

const valid = {
  jacket_size: "L",
  pants_size: "XL",
  address: "  43 rue de France ",
  city: "Nice",
  country: "France",
  phone: "06 12 34 56 78",
};

describe("rewardClaimSchema (F-24)", () => {
  it("tailles, adresse nettoyée et téléphone au format international", () => {
    expect(rewardClaimSchema.parse(valid)).toEqual({
      ...valid,
      address: "43 rue de France",
      phone: "+33612345678",
    });
  });

  it("refuse une taille inconnue, une adresse trop courte, un téléphone invalide", () => {
    expect(rewardClaimSchema.safeParse({ ...valid, jacket_size: "XXXL" }).success).toBe(false);
    expect(rewardClaimSchema.safeParse({ ...valid, address: "43" }).success).toBe(false);
    expect(rewardClaimSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
  });
});

describe("parseGrade (F-24)", () => {
  it("lit la réponse d'artisan_grade et refuse une forme inattendue", () => {
    const grade = {
      xp: 200,
      level: 2,
      levels: [
        { level: 5, xp_min: 1000, reward: "Ensemble de chantier MENAO", reward_detail: null },
      ],
      objectives: [
        {
          code: "premier_chantier",
          title: "Premier chantier terminé",
          description: "Terminer un premier chantier avec MENAO",
          xp: 100,
          target: 1,
          progress: 1,
          achieved_at: "2026-10-14T10:00:00Z",
        },
      ],
      badges: [],
      claims: [],
    };
    expect(parseGrade(grade)).toEqual(grade);
    expect(parseGrade({ ...grade, xp: "200" })).toBeNull();
  });
});
