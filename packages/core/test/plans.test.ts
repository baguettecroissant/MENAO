import { describe, expect, it } from "vitest";
import {
  ANNUAL_FREE_MONTHS,
  BILLING_PERIODS,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  checkoutNotice,
  monthlyEquivalentCents,
  planAddedFeatures,
  planComparison,
  planFeatureDiffers,
  splitPlanComparison,
  planFeatureCell,
  planMonthlyRequests,
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

  it("paiement : au mois ou à l'année, engagement d'un an affiché au moment de payer (ADR 0383)", () => {
    expect(BILLING_PERIODS).toEqual(["mensuel", "annuel"]);
    const values = { annualPrice: "1 500 €", monthlyPrice: "150 €" };
    expect(checkoutNotice("mensuel", values)).toBe(
      "Engagement d'un an à partir du premier paiement, à la fin des 2 mois d'essai, qui démarrent à la mise en ligne de votre fiche : 150 € HT par mois pendant 12 mois. Rien n'est prélevé avant, et vous pouvez renoncer sans frais pendant l'essai.",
    );
    expect(checkoutNotice("annuel", values)).toBe(
      "Engagement d'un an à partir du premier paiement, à la fin des 2 mois d'essai, qui démarrent à la mise en ligne de votre fiche : 1 500 € HT payés d'avance pour l'année (2 mois offerts). Rien n'est prélevé avant, et vous pouvez renoncer sans frais pendant l'essai.",
    );
  });

  it("demandes de chantier par mois : 10, 25, illimitées (plafond lu en base)", () => {
    expect(planMonthlyRequests({ demandes_mois: 10 })).toBe(10);
    expect(planMonthlyRequests({ demandes_mois: null })).toBe("illimite");
    expect(planMonthlyRequests({ comptes: 1 })).toBeNull();
    expect(planMonthlyRequests(null)).toBeNull();
    expect(planMonthlyRequests({ demandes_mois: "dix" })).toBeNull();
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
    // 2 000 € à 20 % = 400 € ; Ultimate 1 500 € / mois → 4 chantiers par mois.
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

describe("comparatif « ce qui change » (ADR 0368)", () => {
  const inclus = { kind: "inclus" } as const;
  const absent = { kind: "absent" } as const;
  const text = (value: string) => ({ kind: "texte", text: value }) as const;
  const comparison = [
    {
      categorie: "Demandes",
      items: [
        { libelle: "Demandes vérifiées", detail: null, cells: [inclus, inclus, inclus] },
        {
          libelle: "Demandes par mois",
          detail: null,
          cells: [text("10"), text("25"), text("Illimitées")],
        },
        {
          libelle: "Métiers",
          detail: "Choisis",
          cells: [text("2"), text("Illimités"), text("Illimités")],
        },
      ],
    },
    {
      categorie: "Signature",
      items: [{ libelle: "Signature", detail: "Avec un code", cells: [inclus, inclus, inclus] }],
    },
    {
      categorie: "Plans",
      items: [
        { libelle: "Manon", detail: null, cells: [absent, inclus, inclus] },
        { libelle: "DPGF", detail: null, cells: [absent, absent, inclus] },
        { libelle: "Rien", detail: null, cells: [absent, absent, absent] },
      ],
    },
  ];

  it("une ligne diffère si une formule n'a pas la même valeur", () => {
    expect(planFeatureDiffers([inclus, inclus, inclus])).toBe(false);
    expect(planFeatureDiffers([text("2"), text("2"), text("2")])).toBe(false);
    expect(planFeatureDiffers([text("2"), text("3"), text("3")])).toBe(true);
    expect(planFeatureDiffers([absent, inclus, inclus])).toBe(true);
    expect(planFeatureDiffers([inclus, text("oui"), inclus])).toBe(true);
    expect(planFeatureDiffers([])).toBe(false);
  });

  it("sépare les différences (catégories vides retirées) des lignes communes", () => {
    const split = splitPlanComparison(comparison);
    expect(split.total).toBe(7);
    expect(split.differences.map((g) => [g.categorie, g.items.map((i) => i.libelle)])).toEqual([
      ["Demandes", ["Demandes par mois", "Métiers"]],
      ["Plans", ["Manon", "DPGF"]],
    ]);
    expect(split.common).toEqual([
      { libelle: "Demandes vérifiées", detail: null },
      { libelle: "Signature", detail: "Avec un code" },
      { libelle: "Rien", detail: null },
    ]);
  });

  it("compte ce qu'une formule ajoute à une autre", () => {
    // Premium ajoute à Base : demandes, métiers, Manon.
    expect(planAddedFeatures(comparison, 0, 1)).toBe(3);
    // Ultimate ajoute à Premium : demandes, DPGF (métiers identiques).
    expect(planAddedFeatures(comparison, 1, 2)).toBe(2);
    expect(planAddedFeatures(comparison, 1, 1)).toBe(0);
    expect(planAddedFeatures(comparison, 0, 9)).toBe(0);
  });
});
