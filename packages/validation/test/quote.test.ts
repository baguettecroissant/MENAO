import { describe, expect, it } from "vitest";
import { z } from "zod";
import { messages } from "../src/messages";
import {
  quoteLineFormSchema,
  quoteLineSchema,
  quoteLinesSchema,
  quoteRevisionSchema,
  refuseQuoteSchema,
  sendQuoteSchema,
} from "../src/quote";

const base = {
  type: "materiel",
  designation: " Prise Céliane ",
  description: "",
  unit: "u",
  vatRateBp: 1000,
};

describe("lignes de devis (F-19)", () => {
  it("formulaire : quantité et prix saisis en texte, convertis en millièmes et centimes", () => {
    expect(quoteLineFormSchema.parse({ ...base, quantity: "2,5", unitPrice: "22,50" })).toEqual({
      type: "materiel",
      designation: "Prise Céliane",
      description: "",
      unit: "u",
      vatRateBp: 1000,
      quantityMilli: 2500,
      unitPriceHtCents: 2250,
    });
  });

  it("formulaire : erreurs claires sur chaque champ", () => {
    const r = quoteLineFormSchema.safeParse({
      ...base,
      designation: "",
      quantity: "0",
      unitPrice: "22,505",
      vatRateBp: 700,
    });
    expect(r.success).toBe(false);
    const byField = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path[0], i.message]));
    expect(byField).toEqual({
      designation: messages.required,
      quantity: messages.quantityInvalid,
      unitPrice: messages.priceInvalid,
      vatRateBp: messages.vatRateInvalid,
    });
  });

  it("montant d'une ligne plafonné à 10 000 000 € HT", () => {
    const r = quoteLineFormSchema.safeParse({ ...base, quantity: "100", unitPrice: "100000,01" });
    expect(r.error?.issues[0]?.message).toBe(messages.lineAmountTooHigh);
  });

  it("envoi à la base : nombres entiers, 200 lignes au plus", () => {
    const line = { ...base, designation: "Prise", quantityMilli: 4000, unitPriceHtCents: 2250 };
    expect(quoteLineSchema.safeParse(line).success).toBe(true);
    expect(quoteLineSchema.safeParse({ ...line, quantityMilli: 2.5 }).success).toBe(false);
    expect(quoteLineSchema.safeParse({ ...line, unitPriceHtCents: -1 }).success).toBe(false);
    expect(quoteLinesSchema.safeParse(Array(201).fill(line)).error?.issues[0]?.message).toBe(
      messages.tooManyLines,
    );
  });
});

describe("envoi du devis et réponse du client (F-21)", () => {
  it("modalités d'envoi : acompte, date de début, durée", () => {
    expect(
      sendQuoteSchema.parse({
        depositPercent: " 30 ",
        saveDefault: false,
        startDate: "2026-10-20",
        durationDays: "2",
      }),
    ).toEqual({ depositPercent: 30, saveDefault: false, startDate: "2026-10-20", durationDays: 2 });
    const r = sendQuoteSchema.safeParse({
      depositPercent: "100",
      saveDefault: true,
      startDate: "20/10/2026",
      durationDays: "1,5",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = z.flattenError(r.error).fieldErrors;
      expect(errors.depositPercent).toEqual(["Indiquez un acompte entier entre 1 et 99 %."]);
      expect(errors.startDate).toEqual(["Choisissez la date de début prévisionnelle."]);
      expect(errors.durationDays).toEqual(["Indiquez une durée entière entre 1 et 365 jours."]);
    }
  });

  it("refus : motif de la liste, commentaire de 500 caractères au plus", () => {
    expect(refuseQuoteSchema.parse({ reason: "trop_cher", comment: "  Budget dépassé. " })).toEqual(
      {
        reason: "trop_cher",
        comment: "Budget dépassé.",
      },
    );
    expect(refuseQuoteSchema.safeParse({ reason: "", comment: "" }).success).toBe(false);
    expect(refuseQuoteSchema.safeParse({ reason: "autre", comment: "x".repeat(501) }).success).toBe(
      false,
    );
  });

  it("demande de modification : 10 à 1 000 caractères", () => {
    expect(quoteRevisionSchema.safeParse({ message: "Trop court" }).success).toBe(true);
    expect(quoteRevisionSchema.safeParse({ message: "   court   " }).success).toBe(false);
    expect(quoteRevisionSchema.safeParse({ message: "x".repeat(1001) }).success).toBe(false);
  });
});
