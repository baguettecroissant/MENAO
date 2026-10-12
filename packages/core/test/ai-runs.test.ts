import { describe, expect, it } from "vitest";
import { aiRates } from "../src/ai-runs";

describe("suivi de l'IA", () => {
  it("échecs (illisibles, refus, erreurs) et réponses peu sûres parmi les appels", () => {
    expect(aiRates({ calls: 20, unsure: 3, invalid: 1, refused: 0, errors: 1 })).toEqual({
      failure: 10,
      unsure: 15,
    });
  });

  it("sans appel : pas de taux", () => {
    expect(aiRates({ calls: 0, unsure: 0, invalid: 0, refused: 0, errors: 0 })).toEqual({
      failure: null,
      unsure: null,
    });
  });
});
