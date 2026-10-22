import { describe, expect, it } from "vitest";
import { REFERRAL_MONTHS_PER_YEAR, WELCOME_GIFT_ITEMS, referralProgress } from "../src/referral";

describe("parrainage V2 (F-60, ADR 0154)", () => {
  it("plafond de 12 mois offerts par an pour le parrain", () => {
    expect(REFERRAL_MONTHS_PER_YEAR).toBe(12);
  });

  it("progression du parrain : mois gagnés cette année, restants, plafond atteint", () => {
    expect(referralProgress(0)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(5)).toEqual({ earned: 5, left: 7, capped: false });
    expect(referralProgress(12)).toEqual({ earned: 12, left: 0, capped: true });
  });

  it("valeurs inattendues : jamais de mois négatifs ni au-delà du plafond", () => {
    expect(referralProgress(15)).toEqual({ earned: 12, left: 0, capped: true });
    expect(referralProgress(-3)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(Number.NaN)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(2.7)).toEqual({ earned: 2, left: 10, capped: false });
  });

  it("cadeau de bienvenue du filleul : t-shirt ou casquette", () => {
    expect(WELCOME_GIFT_ITEMS).toEqual(["tshirt", "casquette"]);
  });
});
