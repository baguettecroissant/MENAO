import { describe, expect, it } from "vitest";
import { planContents, planFeatureValue, planHighlights } from "../src/plan-limits";

const ROWS = [
  { categorie: "Demandes", libelle: "Demandes vérifiées", valeurs: { base: true, premium: true } },
  {
    categorie: "Demandes",
    libelle: "Demandes par mois",
    valeurs: { base: "Jusqu'à 10", premium: "Jusqu'à 25" },
  },
  { categorie: "Assistants", libelle: "Secrétaire", valeurs: { base: false, premium: true } },
  { categorie: "Assistants", libelle: "Minutes de voix", valeurs: { base: false, premium: 300 } },
  { categorie: "Équipe", libelle: "Comptes", valeurs: { base: 1, premium: 3 } },
  { categorie: "Devis", libelle: "Appels d'offres", valeurs: { base: false, premium: false } },
];

describe("contenu d'une formule d'après le comparatif (ADR 0363)", () => {
  it("lit une valeur : comprise, avec ou sans précision", () => {
    expect(planFeatureValue({ base: true }, "base")).toEqual({ included: true, value: null });
    expect(planFeatureValue({ premium: 300 }, "premium")).toEqual({ included: true, value: "300" });
    expect(planFeatureValue({ base: " Jusqu'à 10 " }, "base")).toEqual({
      included: true,
      value: "Jusqu'à 10",
    });
  });

  it("lit une valeur : non comprise", () => {
    expect(planFeatureValue({ base: false }, "base").included).toBe(false);
    expect(planFeatureValue({ base: 0 }, "base").included).toBe(false);
    expect(planFeatureValue({ premium: true }, "base").included).toBe(false);
    expect(planFeatureValue(null, "base").included).toBe(false);
    expect(planFeatureValue({ base: "  " }, "base").included).toBe(false);
  });

  it("range ce qui est compris par catégorie, dans l'ordre du comparatif", () => {
    const base = planContents(ROWS, "base");
    expect(base.groups.map((g) => g.title)).toEqual(["Demandes", "Équipe"]);
    expect(base.groups[0]?.features).toEqual([
      { label: "Demandes vérifiées", value: null, plus: false },
      { label: "Demandes par mois", value: "Jusqu'à 10", plus: false },
    ]);
    expect(base.excluded).toEqual(["Secrétaire", "Minutes de voix", "Appels d'offres"]);
  });

  it("une formule plus haute comprend plus, et exclut moins", () => {
    const premium = planContents(ROWS, "premium");
    expect(premium.groups.map((g) => g.title)).toEqual(["Demandes", "Assistants", "Équipe"]);
    expect(premium.groups[1]?.features).toEqual([
      { label: "Secrétaire", value: null, plus: true },
      { label: "Minutes de voix", value: "300", plus: true },
    ]);
    expect(premium.excluded).toEqual(["Appels d'offres"]);
  });

  it("compte ce qui est compris et ce qui s'ajoute à Base (lot 71, ADR 0369)", () => {
    const base = planContents(ROWS, "base");
    expect(base.included).toBe(3);
    expect(base.added).toBe(0);
    const premium = planContents(ROWS, "premium");
    expect(premium.included).toBe(5);
    // Secrétaire et minutes (absentes de Base), demandes et comptes (plus haut que Base).
    expect(premium.added).toBe(4);
    expect(premium.groups[0]?.features.map((f) => f.plus)).toEqual([false, true]);
  });
});

describe("cartes « ce que votre formule fait pour vous » (lot 71, ADR 0369)", () => {
  it("Base met en avant ce qu'elle a, sans les fonctions des autres formules", () => {
    expect(planHighlights("base")).toEqual(["requests", "quotes", "payments"]);
  });

  it("Premium et Ultimate commencent par Manon et les demandes", () => {
    expect(planHighlights("premium").slice(0, 2)).toEqual(["secretary", "requests"]);
    expect(planHighlights("entreprise").slice(0, 2)).toEqual(["secretary", "requests"]);
    expect(planHighlights("entreprise")).toContain("tenders");
    expect(planHighlights("premium")).not.toContain("tenders");
  });
});
