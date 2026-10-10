import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNIT,
  QUOTE_LINE_TYPES,
  QUOTE_UNITS,
  allowedVatRates,
  formatQuantity,
  lineTotalHtCents,
  lineTtcCents,
  parseEuros,
  parseQuantity,
  quoteTotals,
} from "../src/quote";

// Lignes de la maquette « Vue d'une génération de devis » : 300,00 € HT, 330,00 € TTC.
const prises = { quantityMilli: 4000, unitPriceHtCents: 2250, vatRateBp: 1000 };
const pose = { quantityMilli: 3000, unitPriceHtCents: 5500, vatRateBp: 1000 };
const deplacement = { quantityMilli: 1000, unitPriceHtCents: 4500, vatRateBp: 1000 };

describe("devis : calculs en centimes (F-19)", () => {
  it("lignes de la maquette : HT, TTC affiché par ligne, totaux", () => {
    expect(lineTotalHtCents(prises.quantityMilli, prises.unitPriceHtCents)).toBe(9000);
    expect(lineTtcCents(prises)).toBe(9900);
    expect(lineTtcCents(pose)).toBe(18150);
    expect(lineTtcCents(deplacement)).toBe(4950);
    expect(quoteTotals([prises, pose])).toEqual({
      totalHtCents: 25500,
      totalTvaCents: 2550,
      totalTtcCents: 28050,
      vat: [{ rateBp: 1000, baseHtCents: 25500, tvaCents: 2550 }],
    });
    expect(quoteTotals([prises, pose, deplacement]).totalTtcCents).toBe(33000);
  });

  it("arrondi au centime le plus proche (moitié vers le haut), quantités décimales", () => {
    expect(lineTotalHtCents(2500, 3333)).toBe(8333); // 2,5 h × 33,33 € = 83,325 €
    expect(lineTotalHtCents(333, 1234)).toBe(411); // 0,333 m² × 12,34 € = 4,10922 €
    expect(lineTotalHtCents(1, 1)).toBe(0);
    // Grands nombres : calcul exact (pas d'erreur de virgule flottante).
    expect(lineTotalHtCents(99_999_999, 100_000_000)).toBe(9_999_999_900_000);
  });

  it("TVA calculée par taux sur le total hors taxe, ventilée du plus petit au plus grand taux", () => {
    const petites = [
      { quantityMilli: 1000, unitPriceHtCents: 3, vatRateBp: 2000 },
      { quantityMilli: 1000, unitPriceHtCents: 3, vatRateBp: 2000 },
    ];
    // Par ligne, on obtiendrait 1 + 1 centime ; sur le total du taux : 6 × 20 % = 1,2 → 1.
    expect(quoteTotals(petites).totalTvaCents).toBe(1);
    expect(
      quoteTotals([
        { quantityMilli: 1000, unitPriceHtCents: 10000, vatRateBp: 2000 },
        { quantityMilli: 2000, unitPriceHtCents: 1000, vatRateBp: 550 },
        { quantityMilli: 1000, unitPriceHtCents: 5000, vatRateBp: 1000 },
      ]),
    ).toEqual({
      totalHtCents: 17000,
      totalTvaCents: 2610,
      totalTtcCents: 19610,
      vat: [
        { rateBp: 550, baseHtCents: 2000, tvaCents: 110 },
        { rateBp: 1000, baseHtCents: 5000, tvaCents: 500 },
        { rateBp: 2000, baseHtCents: 10000, tvaCents: 2000 },
      ],
    });
  });

  it("devis vide ; artisan non assujetti (TVA non applicable)", () => {
    expect(quoteTotals([])).toEqual({
      totalHtCents: 0,
      totalTvaCents: 0,
      totalTtcCents: 0,
      vat: [],
    });
    expect(quoteTotals([{ ...prises, vatRateBp: 0 }])).toEqual({
      totalHtCents: 9000,
      totalTvaCents: 0,
      totalTtcCents: 9000,
      vat: [{ rateBp: 0, baseHtCents: 9000, tvaCents: 0 }],
    });
    expect(allowedVatRates(true)).toEqual([550, 1000, 2000]);
    expect(allowedVatRates(false)).toEqual([0]);
  });
});

describe("saisie des montants et quantités", () => {
  it("prix en euros : virgule ou point, espaces de milliers, 2 décimales au plus", () => {
    expect(parseEuros("22,50")).toBe(2250);
    expect(parseEuros("22.5")).toBe(2250);
    expect(parseEuros(" 1 234,56 ")).toBe(123456);
    expect(parseEuros("1 234,5")).toBe(123450);
    expect(parseEuros("0")).toBe(0);
    for (const bad of ["", "abc", "22,505", "-5", "1,2,3", "12e3"])
      expect(parseEuros(bad), bad).toBeNull();
  });

  it("quantités : strictement positives, 3 décimales au plus ; affichage à la française", () => {
    expect(parseQuantity("4")).toBe(4000);
    expect(parseQuantity("2,5")).toBe(2500);
    expect(parseQuantity("0,001")).toBe(1);
    for (const bad of ["0", "", "1,2345", "-1", "deux"]) expect(parseQuantity(bad), bad).toBeNull();
    expect(formatQuantity(2500)).toBe("2,5");
    expect(formatQuantity(4000)).toBe("4");
    expect(formatQuantity(1)).toBe("0,001");
    expect(formatQuantity(1_234_500)).toBe("1\u202f234,5");
  });

  it("unité proposée selon le type de ligne", () => {
    expect(DEFAULT_UNIT).toEqual({ materiel: "u", main_oeuvre: "h", autre: "forfait" });
  });
});

describe("cohérence avec la base", () => {
  it("types de ligne et unités identiques aux enums", () => {
    expect([...Constants.public.Enums.quote_line_type].sort()).toEqual(
      [...QUOTE_LINE_TYPES].sort(),
    );
    expect([...Constants.public.Enums.quote_unit].sort()).toEqual([...QUOTE_UNITS].sort());
  });
});
