import { describe, expect, it } from "vitest";
import { parseReferral } from "../src/referral";

describe("bilan du parrainage (F-60)", () => {
  it("réponse attendue", () => {
    expect(parseReferral({ code: "k7m2qx9a", joined: 2, rewarded: 1, months_earned: 1 })).toEqual({
      code: "k7m2qx9a",
      joined: 2,
      rewarded: 1,
      months_earned: 1,
    });
  });

  it("artisan pas encore validé (null) ou réponse inattendue : null", () => {
    expect(parseReferral(null)).toBeNull();
    expect(
      parseReferral({ code: "TROP-LONG-CODE", joined: 0, rewarded: 0, months_earned: 0 }),
    ).toBeNull();
    expect(
      parseReferral({ code: "k7m2qx9a", joined: -1, rewarded: 0, months_earned: 0 }),
    ).toBeNull();
  });
});
