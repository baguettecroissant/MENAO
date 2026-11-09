import { describe, expect, it } from "vitest";
import {
  ANNUAL_FREE_MONTHS,
  BILLING_PERIODS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  checkoutNotice,
  engagementExitAllowed,
  monthlyEquivalentCents,
  planComparison,
  planFeatureCell,
  subscriptionPayback,
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

  it("paiement : au mois ou à l'année, texte affiché au moment de payer", () => {
    expect(BILLING_PERIODS).toEqual(["mensuel", "annuel"]);
    expect(
      checkoutNotice("annuel", {
        firstPayment: "26 décembre 2026",
        annualPrice: "1 500 €",
        monthlyPrice: "150 €",
      }),
    ).toBe(
      "Engagement de 12 mois à partir du premier paiement, le 26 décembre 2026, après les 2 mois d'essai : 1 500 € HT payés d'avance pour l'année (2 mois offerts). Garantie : moins de 4 demandes 2 mois de suite, ou activité cessée, et vous partez sans frais.",
    );
    expect(
      checkoutNotice("mensuel", {
        firstPayment: "26 décembre 2026",
        annualPrice: "1 500 €",
        monthlyPrice: "150 €",
      }),
    ).toBe(
      "Sans engagement : aucun prélèvement avant le 26 décembre 2026, puis 150 € HT par mois, résiliable à tout moment.",
    );
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

describe("subscriptionPayback (calculateur des formules, ADR 0265)", () => {
  it("marge supérieure au prix : un chantier tous les N mois (arrondi vers le bas)", () => {
    // 4 500 € à 25 % = 1 125 € de marge ; Premium 500 € / mois → 2 mois couverts.
    expect(subscriptionPayback(50000, 450000, 25)).toEqual({
      marginCents: 112500,
      kind: "every",
      months: 2,
    });
  });
  it("marge inférieure au prix : N chantiers par mois (arrondi vers le haut)", () => {
    // 2 000 € à 20 % = 400 € ; Entreprise 1 500 € / mois → 4 chantiers par mois.
    expect(subscriptionPayback(150000, 200000, 20)).toEqual({
      marginCents: 40000,
      kind: "perMonth",
      jobs: 4,
    });
  });
  it("marge égale au prix : un chantier par mois", () => {
    expect(subscriptionPayback(15000, 60000, 25)).toEqual({
      marginCents: 15000,
      kind: "every",
      months: 1,
    });
  });
  it("marge nulle ou entrées invalides : pas de calcul", () => {
    expect(subscriptionPayback(15000, 0, 25)).toBeNull();
    expect(subscriptionPayback(15000, 100000, 0)).toBeNull();
    expect(subscriptionPayback(0, 100000, 25)).toBeNull();
    expect(subscriptionPayback(15000, 100000, 120)).toBeNull();
  });
});
