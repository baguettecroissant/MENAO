import { describe, expect, it } from "vitest";
import {
  DISPUTE_CATEGORIES,
  DISPUTE_DESCRIPTION_LIMITS,
  reportSuspendsChantier,
} from "../src/dispute";

describe("signalement d'un problème (F-42)", () => {
  it("catégories de la spec", () => {
    expect(DISPUTE_CATEGORIES).toEqual(["retard", "malfacon", "comportement", "paiement", "autre"]);
    expect(DISPUTE_DESCRIPTION_LIMITS).toEqual({ min: 20, max: 2000 });
  });

  it("chantier actif : passage en litige ; chantier clôturé ou annulé : ticket seul", () => {
    for (const status of [
      "rdv_planifie",
      "devis_signe",
      "en_cours",
      "reserves_a_lever",
      "receptionne",
    ] as const) {
      expect(reportSuspendsChantier(status)).toBe(true);
    }
    for (const status of ["cloture", "annule", "en_litige", "devis_refuse"] as const) {
      expect(reportSuspendsChantier(status)).toBe(false);
    }
  });
});
