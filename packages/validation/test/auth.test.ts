import { describe, expect, it } from "vitest";
import {
  magicLinkSchema,
  newPasswordSchema,
  normalizePhone,
  signInSchema,
  signUpSchema,
} from "../src/auth";
import { messages } from "../src/messages";

// Données fictives uniquement : domaine réservé .test, numéros des tranches fiction ARCEP (06 39 98) et Ofcom (07700 900).
const valid = {
  firstName: "  Camille ",
  lastName: "Exemple",
  phone: "06 39 98 00 01",
  email: "Camille@Example.test",
  password: "correct-horse-battery",
  acceptTerms: true,
  marketingOptIn: false,
};

describe("signUpSchema", () => {
  it("accepte une inscription valide et normalise les champs", () => {
    const r = signUpSchema.parse(valid);
    expect(r.firstName).toBe("Camille");
    expect(r.email).toBe("camille@example.test");
    expect(r.phone).toBe("+33639980001");
  });

  it("le téléphone est optionnel", () => {
    expect(signUpSchema.parse({ ...valid, phone: "" }).phone).toBeUndefined();
    expect(signUpSchema.parse({ ...valid, phone: undefined }).phone).toBeUndefined();
  });

  it("exige un mot de passe d'au moins 12 caractères (F-08)", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "court-11car" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(messages.passwordTooShort);
  });

  it("refuse un mot de passe de plus de 72 caractères (limite bcrypt)", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }).success).toBe(false);
  });

  it("exige l'acceptation des CGU et de la confidentialité", () => {
    const r = signUpSchema.safeParse({ ...valid, acceptTerms: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(messages.termsRequired);
  });

  it("refuse prénom ou nom vides", () => {
    expect(signUpSchema.safeParse({ ...valid, firstName: "   " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, lastName: "" }).success).toBe(false);
  });

  it("refuse un e-mail invalide", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "pas-un-email" }).success).toBe(false);
  });

  it("refuse un téléphone invalide", () => {
    const r = signUpSchema.safeParse({ ...valid, phone: "12" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(messages.phoneInvalid);
  });
});

describe("normalizePhone", () => {
  it.each([
    ["06 39 98 00 01", "+33639980001"],
    ["06.39.98.00.01", "+33639980001"],
    ["+33 6 39 98 00 01", "+33639980001"],
    ["0033639980001", "+33639980001"],
    ["+44 7700 900123", "+447700900123"],
    ["6 39 98 00 01", "+33639980001"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12", "06 39 98", "+0 123", "abc"])("rejette « %s »", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("signInSchema et magicLinkSchema", () => {
  it("accepte e-mail + mot de passe", () => {
    expect(signInSchema.parse({ email: "a@example.test", password: "x" }).email).toBe(
      "a@example.test",
    );
  });

  it("refuse un mot de passe vide à la connexion", () => {
    expect(signInSchema.safeParse({ email: "a@example.test", password: "" }).success).toBe(false);
  });

  it("le lien magique ne demande qu'un e-mail", () => {
    expect(magicLinkSchema.parse({ email: " A@Example.test " }).email).toBe("a@example.test");
  });
});

describe("newPasswordSchema", () => {
  it("applique les mêmes règles que l'inscription", () => {
    expect(newPasswordSchema.safeParse({ password: "court" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "un-mot-de-passe-long" }).success).toBe(true);
  });
});
