import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEPOSIT_PERCENT,
  DEFAULT_UNIT,
  QUOTE_LINE_TYPES,
  QUOTE_REFUSAL_REASONS,
  QUOTE_UNITS,
  allowedVatRates,
  formatQuantity,
  isValidDepositPercent,
  isValidDurationDays,
  lineTotalHtCents,
  lineTtcCents,
  normalizeVoiceLines,
  parseEuros,
  parseQuantity,
  paymentSchedule,
  quoteFromVoiceJsonSchema,
  quoteStartDateError,
  quoteTotals,
  type RawVoiceLine,
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

describe("dictée intelligente : lignes proposées par l'IA (F-19)", () => {
  const raw = (over: Partial<RawVoiceLine> = {}): RawVoiceLine => ({
    type: "materiel",
    designation: " Prise de courant Legrand Céliane ",
    description: null,
    quantite: 4,
    unite: "u",
    prix_unitaire_ht: 22.5,
    tva: null,
    ...over,
  });
  const assujetti = { assujettiTva: true, defaultVatBp: 1000 };

  it("convertit quantités et prix en millièmes et centimes, taux dicté ou proposé", () => {
    expect(
      normalizeVoiceLines(
        [
          raw(),
          raw({
            type: "main_oeuvre",
            designation: "Pose",
            quantite: 2.5,
            unite: "h",
            prix_unitaire_ht: 55,
            tva: 20,
          }),
          raw({
            type: "autre",
            designation: "Déplacement",
            quantite: 1,
            unite: "forfait",
            prix_unitaire_ht: 0.29,
            tva: 5.5,
          }),
        ],
        assujetti,
      ),
    ).toEqual([
      {
        type: "materiel",
        designation: "Prise de courant Legrand Céliane",
        description: "",
        quantityMilli: 4000,
        unit: "u",
        unitPriceHtCents: 2250,
        vatRateBp: 1000,
      },
      {
        type: "main_oeuvre",
        designation: "Pose",
        description: "",
        quantityMilli: 2500,
        unit: "h",
        unitPriceHtCents: 5500,
        vatRateBp: 2000,
      },
      {
        type: "autre",
        designation: "Déplacement",
        description: "",
        quantityMilli: 1000,
        unit: "forfait",
        unitPriceHtCents: 29,
        vatRateBp: 550,
      },
    ]);
  });

  it("prix non dicté : 0 € à compléter ; unité inconnue : unité du type ; franchise en base : 0 %", () => {
    const [line] = normalizeVoiceLines(
      [raw({ prix_unitaire_ht: null, unite: "palette", tva: 10 })],
      {
        assujettiTva: false,
        defaultVatBp: 0,
      },
    );
    expect(line).toMatchObject({ unitPriceHtCents: 0, unit: "u", vatRateBp: 0 });
  });

  it("écarte les lignes inutilisables et limite à 50 lignes", () => {
    expect(
      normalizeVoiceLines(
        [
          raw({ type: "inconnu" }),
          raw({ designation: "   " }),
          raw({ quantite: 0 }),
          raw({ quantite: -2 }),
          raw({ prix_unitaire_ht: -5 }),
          raw({ quantite: 100, prix_unitaire_ht: 200_000 }),
          raw({ quantite: Number.NaN }),
        ],
        assujetti,
      ),
    ).toEqual([]);
    expect(
      normalizeVoiceLines(
        Array.from({ length: 60 }, () => raw()),
        assujetti,
      ),
    ).toHaveLength(50);
  });

  it("schéma de sortie structurée : types et unités de la base", () => {
    const schema = quoteFromVoiceJsonSchema();
    const item = schema.properties.lignes.items;
    expect(item.properties.type.enum).toEqual([...QUOTE_LINE_TYPES]);
    expect(item.properties.unite.enum).toEqual([...QUOTE_UNITS]);
    expect(item.required).toEqual(Object.keys(item.properties));
  });
});

describe("envoi du devis : échéancier et dates (F-20, F-21)", () => {
  it("acompte arrondi au centime inférieur, solde = TTC − acompte", () => {
    expect(paymentSchedule(33000, DEFAULT_DEPOSIT_PERCENT)).toEqual([
      { percent: 30, trigger: "signature", amountCents: 9900 },
      { percent: 70, trigger: "reception", amountCents: 23100 },
    ]);
    // 91,85 € × 30 % = 27,555 € : 27,55 € d'acompte, 64,30 € de solde.
    expect(paymentSchedule(9185, 30)).toEqual([
      { percent: 30, trigger: "signature", amountCents: 2755 },
      { percent: 70, trigger: "reception", amountCents: 6430 },
    ]);
    const [deposit, balance] = paymentSchedule(123_456_789, 37);
    expect((deposit?.amountCents ?? 0) + (balance?.amountCents ?? 0)).toBe(123_456_789);
  });

  it("pourcentage d'acompte entier entre 1 et 99", () => {
    expect(isValidDepositPercent(1)).toBe(true);
    expect(isValidDepositPercent(99)).toBe(true);
    for (const value of [0, 100, 30.5, Number.NaN])
      expect(isValidDepositPercent(value)).toBe(false);
  });

  it("date de début : après aujourd'hui (heure de Paris), dans l'année", () => {
    expect(quoteStartDateError("2026-10-11", "2026-10-10")).toBeNull();
    expect(quoteStartDateError("2027-10-10", "2026-10-10")).toBeNull();
    expect(quoteStartDateError("2026-10-10", "2026-10-10")).toBe("passee");
    expect(quoteStartDateError("2027-10-11", "2026-10-10")).toBe("trop_loin");
    expect(quoteStartDateError("2027-02-30", "2026-10-10")).toBe("invalide");
    expect(quoteStartDateError("demain", "2026-10-10")).toBe("invalide");
  });

  it("motifs de refus identiques à l'enum de la base", () => {
    expect([...QUOTE_REFUSAL_REASONS]).toEqual(Constants.public.Enums.quote_refusal_reason);
  });

  it("durée estimée en jours, entre 1 et 365", () => {
    expect(isValidDurationDays(1)).toBe(true);
    expect(isValidDurationDays(365)).toBe(true);
    for (const value of [0, 366, 1.5]) expect(isValidDurationDays(value)).toBe(false);
  });
});
