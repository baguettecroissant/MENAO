import { describe, expect, it } from "vitest";
import { rewardClaimSchema } from "../src/gamification";

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
