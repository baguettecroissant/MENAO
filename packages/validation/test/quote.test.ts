import { describe, expect, it } from "vitest";
import { messages } from "../src/messages";
import { quoteLineFormSchema, quoteLineSchema, quoteLinesSchema } from "../src/quote";

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
