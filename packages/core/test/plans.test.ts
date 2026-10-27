import { describe, expect, it } from "vitest";
import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  engagementExitAllowed,
  monthlyEquivalentCents,
  planComparison,
  planFeatureCell,
} from "../src/plans";

describe("formules et engagement (F-15, ADR 0200)", () => {
  it("à l'année : 12 mois d'engagement, payés d'avance, 2 mois offerts", () => {
    expect(ENGAGEMENT_MONTHS).toBe(12);
    expect(ANNUAL_FREE_MONTHS).toBe(2);
    expect(annualPriceCents(15000)).toBe(150000);
    expect(annualPriceCents(50000)).toBe(500000);
    expect(annualPriceCents(150000)).toBe(1500000);
    // Équivalent mensuel affiché, en centimes entiers.
    expect(monthlyEquivalentCents(150000)).toBe(12500);
    expect(monthlyEquivalentCents(500000)).toBe(41667);
    expect(monthlyEquivalentCents(1500000)).toBe(125000);
  });

  it("garantie : moins de 4 demandes 2 mois de suite, ou activité cessée, et l'artisan part sans frais", () => {
    expect(ENGAGEMENT_GUARANTEE).toEqual({ minRequests: 4, consecutiveMonths: 2 });
    // Demandes reçues par mois complet, du plus ancien au plus récent.
    expect(engagementExitAllowed({ monthlyRequests: [6, 3, 2], ceasedActivity: false })).toBe(true);
    expect(engagementExitAllowed({ monthlyRequests: [3, 4, 2], ceasedActivity: false })).toBe(
      false,
    );
    expect(engagementExitAllowed({ monthlyRequests: [2, 3, 5], ceasedActivity: false })).toBe(true);
    expect(engagementExitAllowed({ monthlyRequests: [3], ceasedActivity: false })).toBe(false);
    expect(engagementExitAllowed({ monthlyRequests: [], ceasedActivity: true })).toBe(true);
    expect(engagementExitAllowed({ monthlyRequests: [9, 9], ceasedActivity: true })).toBe(true);
  });

  it("cellule du comparatif : inclus, absent ou texte", () => {
    expect(planFeatureCell(true)).toEqual({ kind: "inclus" });
    expect(planFeatureCell(false)).toEqual({ kind: "absent" });
    expect(planFeatureCell(null)).toEqual({ kind: "absent" });
    expect(planFeatureCell(undefined)).toEqual({ kind: "absent" });
    expect(planFeatureCell("Jusqu'à 10 par mois")).toEqual({
      kind: "texte",
      text: "Jusqu'à 10 par mois",
    });
    expect(planFeatureCell("  ")).toEqual({ kind: "absent" });
    expect(planFeatureCell(3)).toEqual({ kind: "texte", text: "3" });
  });

  it("comparatif : catégories dans l'ordre, une cellule par formule", () => {
    const rows = [
      {
        categorie: "Paiements",
        libelle: "Échéancier",
        detail: null,
        ordre: 30,
        valeurs: { base: false, premium: true },
      },
      {
        categorie: "Demandes",
        libelle: "Demandes par mois",
        detail: "Même classement",
        ordre: 10,
        valeurs: { base: "10", premium: "25", entreprise: "Illimitées" },
      },
      { categorie: "Demandes", libelle: "Métiers", detail: null, ordre: 20, valeurs: "invalide" },
    ];
    expect(planComparison(rows, ["base", "premium", "entreprise"])).toEqual([
      {
        categorie: "Demandes",
        items: [
          {
            libelle: "Demandes par mois",
            detail: "Même classement",
            cells: [
              { kind: "texte", text: "10" },
              { kind: "texte", text: "25" },
              { kind: "texte", text: "Illimitées" },
            ],
          },
          {
            libelle: "Métiers",
            detail: null,
            cells: [{ kind: "absent" }, { kind: "absent" }, { kind: "absent" }],
          },
        ],
      },
      {
        categorie: "Paiements",
        items: [
          {
            libelle: "Échéancier",
            detail: null,
            cells: [{ kind: "absent" }, { kind: "inclus" }, { kind: "absent" }],
          },
        ],
      },
    ]);
  });
});
