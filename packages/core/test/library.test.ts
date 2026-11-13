import { describe, expect, it } from "vitest";
import {
  type LibrarySettings,
  type LibrarySupply,
  type WorkComponent,
  belowMarginAlert,
  componentAmounts,
  formatCoefficient,
  formatRateBp,
  markupRateBp,
  parseCoefficient,
  parseRatePercent,
  quoteMargin,
  supplyPriceIsOld,
  lineCostCents,
  workPricing,
  workQuoteLines,
} from "../src/library";

// Exemple du document (chiffres d'illustration) : coefficient 1,30, heure à 35 € de coût, 55 € de vente.
const SETTINGS: LibrarySettings = {
  hourCostCents: 3500,
  hourPriceCents: 5500,
  supplyCoefBp: 13_000,
  marginAlertBp: null,
  priceMaxAgeMonths: 6,
};
const supply = (id: string, price: number, wasteBp = 0): [string, LibrarySupply] => [
  id,
  { id, purchasePriceCents: price, wasteBp },
];
const SUPPLIES = new Map([
  supply("bati", 18_000),
  supply("cuvette", 15_000),
  supply("abattant", 4000),
  supply("petites", 1500),
  supply("carrelage", 3000, 1000),
]);
const part = (
  kind: WorkComponent["kind"],
  quantityMilli: number,
  supplyId: string | null = null,
  costCents: number | null = null,
): WorkComponent => ({
  kind,
  supplyId,
  quantityMilli,
  costCents,
});
const WC = [
  part("fourniture", 1000, "bati"),
  part("fourniture", 1000, "cuvette"),
  part("fourniture", 1000, "abattant"),
  part("fourniture", 1000, "petites"),
  part("heures", 3000),
];

describe("workPricing", () => {
  it("pose d'un WC suspendu : coût 490 €, prix 665,50 €, marge 175,50 € (26,4 %)", () => {
    const p = workPricing(null, WC, SETTINGS, SUPPLIES);
    expect(p).toMatchObject({
      costCents: 49_000,
      computedPriceCents: 66_550,
      priceCents: 66_550,
      marginCents: 17_550,
      markupBp: 2637,
    });
    expect(p.supplies).toEqual({ costCents: 38_500, saleCents: 50_050 });
    expect(p.labor).toEqual({ costCents: 10_500, saleCents: 16_500, hoursMilli: 3000 });
    expect(p.other).toEqual({ costCents: 0, saleCents: 0 });
  });

  it("un prix fixé à la main l'emporte, la marge suit", () => {
    const p = workPricing(60_000, WC, SETTINGS, SUPPLIES);
    expect(p).toMatchObject({
      priceCents: 60_000,
      computedPriceCents: 66_550,
      marginCents: 11_000,
    });
  });

  it("sans composition : prix repris des devis, coût inconnu", () => {
    const p = workPricing(16_500, [], SETTINGS, SUPPLIES);
    expect(p).toMatchObject({
      costCents: null,
      priceCents: 16_500,
      marginCents: null,
      markupBp: null,
    });
  });

  it("perte sur une fourniture et autres frais au coefficient", () => {
    // 12,5 m² × 30 € × 1,10 = 412,50 € ; évacuation 1 × 80 €.
    const p = workPricing(
      null,
      [part("fourniture", 12_500, "carrelage"), part("frais", 1000, null, 8000)],
      SETTINGS,
      SUPPLIES,
    );
    expect(p.supplies.costCents).toBe(41_250);
    expect(p.other).toEqual({ costCents: 8000, saleCents: 10_400 });
    expect(p.costCents).toBe(49_250);
  });

  it("sans coût horaire réglé : coût inconnu ; sans prix de l'heure : prix inconnu", () => {
    const p = workPricing(
      null,
      WC,
      { ...SETTINGS, hourCostCents: null, hourPriceCents: null },
      SUPPLIES,
    );
    expect(p).toMatchObject({ costCents: null, computedPriceCents: null, priceCents: null });
  });

  it("une fourniture retirée de la bibliothèque rend le coût inconnu", () => {
    expect(componentAmounts(part("fourniture", 1000, "disparue"), SETTINGS, SUPPLIES)).toEqual({
      costCents: null,
      saleCents: null,
    });
  });
});

describe("marge d'un devis", () => {
  it("calculée sur les lignes dont le coût est connu", () => {
    expect(
      quoteMargin([
        { totalHtCents: 66_550, costCents: 49_000 },
        { totalHtCents: 122_400, costCents: 94_320 },
        { totalHtCents: 16_500, costCents: null },
      ]),
    ).toEqual({ marginCents: 45_630, markupBp: 2415, counted: 2, lines: 3 });
    expect(quoteMargin([{ totalHtCents: 3500, costCents: null }])).toEqual({
      marginCents: null,
      markupBp: null,
      counted: 0,
      lines: 1,
    });
  });

  it("alerte seulement sous un seuil fixé par l'artisan", () => {
    expect(belowMarginAlert(1530, null)).toBe(false);
    expect(belowMarginAlert(1530, 2000)).toBe(true);
    expect(belowMarginAlert(2415, 2000)).toBe(false);
    expect(belowMarginAlert(null, 2000)).toBe(false);
  });

  it("taux de marque, vente à perte", () => {
    expect(markupRateBp(10_000, 12_000)).toBe(-2000);
    expect(markupRateBp(0, 100)).toBeNull();
  });
});

describe("saisies et affichage", () => {
  it("coefficient", () => {
    expect(parseCoefficient("1,30")).toBe(13_000);
    expect(parseCoefficient("× 1,3")).toBe(13_000);
    expect(parseCoefficient("1.275")).toBe(12_750);
    expect(parseCoefficient("0,2")).toBeNull();
    expect(parseCoefficient("abc")).toBeNull();
    expect(formatCoefficient(13_000)).toBe("1,30");
    expect(formatCoefficient(12_750)).toBe("1,2750");
  });

  it("taux en pourcentage", () => {
    expect(parseRatePercent("20")).toBe(2000);
    expect(parseRatePercent("20,5 %")).toBe(2050);
    expect(parseRatePercent("95")).toBeNull();
    expect(formatRateBp(2637)).toBe("26,4 %");
  });

  it("prix d'achat ancien", () => {
    expect(supplyPriceIsOld("2026-03-10", "2026-11-12", 6)).toBe(true);
    expect(supplyPriceIsOld("2026-05-13", "2026-11-12", 6)).toBe(false);
    expect(supplyPriceIsOld(null, "2026-11-12", 6)).toBe(false);
  });
});

describe("lignes de devis d'un ouvrage", () => {
  const work = {
    id: "w1",
    designation: "Pose d'un WC suspendu",
    description: "Fourniture et pose",
    unit: "u",
    lineType: "autre" as const,
    vatRateBp: 1000,
    detailed: false,
  };
  const labels = { supplies: "(fournitures)", labor: "(main d'œuvre)" };

  it("une ligne au prix retenu, avec son coût privé", () => {
    const pricing = workPricing(null, WC, SETTINGS, SUPPLIES);
    expect(workQuoteLines(work, pricing, labels)).toEqual([
      {
        type: "autre",
        designation: "Pose d'un WC suspendu",
        description: "Fourniture et pose",
        unit: "u",
        vatRateBp: 1000,
        unitPriceHtCents: 66_550,
        unitCostCents: 49_000,
        workId: "w1",
      },
    ]);
  });

  it("détaillé : fournitures et main d'œuvre séparées, prix à la main reporté sur la main d'œuvre", () => {
    const detailed = { ...work, detailed: true };
    const lines = workQuoteLines(detailed, workPricing(null, WC, SETTINGS, SUPPLIES), labels);
    expect(lines.map((l) => [l.type, l.designation, l.unitPriceHtCents, l.unitCostCents])).toEqual([
      ["materiel", "Pose d'un WC suspendu (fournitures)", 50_050, 38_500],
      ["main_oeuvre", "Pose d'un WC suspendu (main d'œuvre)", 16_500, 10_500],
    ]);
    const manual = workQuoteLines(detailed, workPricing(60_000, WC, SETTINGS, SUPPLIES), labels);
    expect(manual.map((l) => l.unitPriceHtCents)).toEqual([50_050, 9950]);
  });

  it("sans prix : aucune ligne ; coût d'une ligne selon la quantité", () => {
    expect(workQuoteLines(work, workPricing(null, [], SETTINGS, SUPPLIES), labels)).toEqual([]);
    expect(lineCostCents(4820, 12_500)).toBe(60_250);
    expect(lineCostCents(null, 1000)).toBeNull();
  });
});

describe("bibliothèque MENAO : prix d'achat inconnu et fourchette indicative (F-147)", () => {
  // Cloison : 0,35 h de pose, 1,05 m² de plaque, 2,2 m de montant (exemple de la maquette).
  const cloison: WorkComponent[] = [
    { kind: "heures", supplyId: null, quantityMilli: 350, costCents: null },
    { kind: "fourniture", supplyId: "plaque", quantityMilli: 1050, costCents: null },
    { kind: "fourniture", supplyId: "montant", quantityMilli: 2200, costCents: null },
  ];
  const sansPrix = new Map<string, LibrarySupply>([
    ["plaque", { id: "plaque", purchasePriceCents: null, wasteBp: 0 }],
    ["montant", { id: "montant", purchasePriceCents: null, wasteBp: 0 }],
  ]);

  it("fourniture sans prix d'achat ni prix publics : coût et fourchette inconnus, rien d'inventé", () => {
    const p = workPricing(null, cloison, SETTINGS, sansPrix);
    expect(p.costCents).toBeNull();
    expect(p.priceCents).toBeNull();
    expect(p.range).toBeNull();
    expect(
      componentAmounts(
        { kind: "fourniture", supplyId: "plaque", quantityMilli: 1050, costCents: null },
        SETTINGS,
        sansPrix,
      ),
    ).toEqual({
      costCents: null,
      saleCents: null,
    });
  });

  it("prix publics : fourchette avec les réglages de l'artisan, milieu retenu, marge inconnue", () => {
    const publics = new Map<string, LibrarySupply>([
      [
        "plaque",
        {
          id: "plaque",
          purchasePriceCents: null,
          wasteBp: 0,
          publicRange: { minCents: 290, maxCents: 360 },
        },
      ],
      [
        "montant",
        {
          id: "montant",
          purchasePriceCents: null,
          wasteBp: 0,
          publicRange: { minCents: 100, maxCents: 135 },
        },
      ],
    ]);
    const p = workPricing(null, cloison, SETTINGS, publics);
    // Pose 0,35 × 55 € = 19,25 € ; plaque 3,05–3,78 € et montant 2,20–2,97 € × 1,30.
    expect(p.range).toEqual({
      lowCents: 1925 + 397 + 286,
      highCents: 1925 + 491 + 386,
      midCents: 2705,
    });
    expect(p.priceCents).toBe(2705);
    expect(p.costCents).toBeNull();
    expect(p.marginCents).toBeNull();
    expect(workPricing(null, cloison, SETTINGS, publics, "bas").priceCents).toBe(1925 + 397 + 286);
    expect(workPricing(null, cloison, SETTINGS, publics, "haut").priceCents).toBe(1925 + 491 + 386);
    expect(workPricing(4000, cloison, SETTINGS, publics, "haut").priceCents).toBe(4000);
  });

  it("le prix d'achat de l'artisan remplace la fourchette ; sans prix de l'heure, pas de fourchette", () => {
    const mixte = new Map<string, LibrarySupply>([
      [
        "plaque",
        {
          id: "plaque",
          purchasePriceCents: 300,
          wasteBp: 0,
          publicRange: { minCents: 290, maxCents: 360 },
        },
      ],
      [
        "montant",
        {
          id: "montant",
          purchasePriceCents: null,
          wasteBp: 0,
          publicRange: { minCents: 100, maxCents: 135 },
        },
      ],
    ]);
    const p = workPricing(null, cloison, SETTINGS, mixte);
    expect(p.range?.lowCents).toBe(1925 + 410 + 286);
    expect(p.range?.highCents).toBe(1925 + 410 + 386);
    expect(
      workPricing(null, cloison, { ...SETTINGS, hourPriceCents: null }, mixte).range,
    ).toBeNull();
    // Un prix fixé à la main reste prioritaire.
    expect(workPricing(3000, cloison, SETTINGS, mixte).priceCents).toBe(3000);
  });
});
