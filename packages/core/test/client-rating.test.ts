import { describe, expect, it } from "vitest";
import {
  CLIENT_RATING_COMMENT_LIMITS,
  CLIENT_RATING_CRITERIA,
  canRateClient,
  clientReputation,
} from "../src/client-rating";

describe("notation du client par l'artisan (F-23)", () => {
  it("trois critères et un commentaire de 50 caractères au moins", () => {
    expect(CLIENT_RATING_CRITERIA).toEqual(["welcome", "clarity", "payment"]);
    expect(CLIENT_RATING_COMMENT_LIMITS.min).toBe(50);
  });

  it("possible seulement une fois le chantier clôturé", () => {
    expect(canRateClient("cloture")).toBe(true);
    for (const status of ["receptionne", "en_cours", "annule", "en_litige"] as const) {
      expect(canRateClient(status)).toBe(false);
    }
  });

  it("moyenne arrondie de chaque critère, null sans note", () => {
    expect(clientReputation([])).toBeNull();
    expect(
      clientReputation([
        { welcome: 100, clarity: 80, payment: 90 },
        { welcome: 70, clarity: 75, payment: 100 },
      ]),
    ).toEqual({ ratings: 2, welcome: 85, clarity: 78, payment: 95 });
  });
});
