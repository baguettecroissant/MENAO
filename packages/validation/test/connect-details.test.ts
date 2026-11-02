import { describe, expect, it } from "vitest";
import { connectDetailsSchema } from "../src/connect-details";
import { messages } from "../src/messages";

// Données fictives ; IBAN d'exemple publié.
const IBAN = "FR76 3000 6000 0112 3456 7890 189";
const business = {
  line1: "1 RUE DE L'EXEMPLE",
  postal_code: "06000",
  city: "NICE",
  country: "FR" as const,
};
const schema = connectDetailsSchema({
  personal: true,
  today: "2026-11-02",
  businessAddress: business,
});

function errors(result: ReturnType<typeof schema.safeParse>) {
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
}

describe("compléments avant Stripe (ADR 0215)", () => {
  it("dirigeant : date, adresse saisie, IBAN normalisé", () => {
    expect(
      schema.parse({
        birthDate: "1985-04-23",
        line1: "2 rue des Essais",
        postalCode: "06100",
        city: "Nice",
        iban: IBAN,
        soleOwner: true,
      }),
    ).toEqual({
      birthDate: { day: 23, month: 4, year: 1985 },
      homeAddress: { line1: "2 rue des Essais", postal_code: "06100", city: "Nice", country: "FR" },
      iban: "FR7630006000011234567890189",
      soleOwner: true,
    });
  });

  it("« même adresse que l'entreprise » : adresse de l'établissement, aucun champ exigé", () => {
    const parsed = schema.parse({ birthDate: "1985-04-23", sameAddress: true, iban: IBAN });
    expect(parsed.homeAddress).toEqual(business);
    expect(parsed.soleOwner).toBe(false);
  });

  it("champs manquants ou faux : un message par champ", () => {
    expect(
      errors(schema.safeParse({ birthDate: "2015-01-01", postalCode: "6100", iban: "FR76 1" })),
    ).toEqual({
      iban: messages.ibanInvalid,
      birthDate: messages.birthDateInvalid,
      line1: messages.required,
      postalCode: messages.postalCodeInvalid,
      city: messages.required,
    });
    expect(errors(schema.safeParse({}))).toMatchObject({
      iban: messages.required,
      birthDate: messages.required,
    });
  });

  it("outre-mer : accepté, mais l'adresse sera saisie chez Stripe", () => {
    const parsed = schema.parse({
      birthDate: "1985-04-23",
      line1: "2 rue",
      postalCode: "97400",
      city: "Saint-Denis",
      iban: IBAN,
    });
    expect(parsed.homeAddress).toBeNull();
  });

  it("sans être le dirigeant : seulement l'IBAN", () => {
    const other = connectDetailsSchema({
      personal: false,
      today: "2026-11-02",
      businessAddress: null,
    });
    expect(other.parse({ iban: IBAN, birthDate: "x" })).toEqual({
      iban: "FR7630006000011234567890189",
    });
  });
});
