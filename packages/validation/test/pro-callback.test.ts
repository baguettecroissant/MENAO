import { describe, expect, it } from "vitest";
import { proCallbackSchema } from "../src/pro-callback";

const valid = {
  first_name: " Camille ",
  phone: "06 12 34 56 78",
  email: "Contact@Example.test",
  trade: "",
  city: " Nice ",
  consent: true,
};

describe("demande de rappel des pages Pro (ADR 0218)", () => {
  it("normalise le téléphone, l'e-mail et les champs facultatifs", () => {
    expect(proCallbackSchema.parse(valid)).toEqual({
      first_name: "Camille",
      phone: "+33612345678",
      email: "contact@example.test",
      trade: null,
      city: "Nice",
      consent: true,
    });
  });

  it("refuse un téléphone invalide, un e-mail invalide ou l'absence d'accord", () => {
    const issues = (value: object) =>
      proCallbackSchema.safeParse({ ...valid, ...value }).error?.issues.map((i) => i.path[0]);
    expect(issues({ phone: "123" })).toEqual(["phone"]);
    expect(issues({ email: "pas-un-email" })).toEqual(["email"]);
    expect(issues({ consent: false })).toEqual(["consent"]);
    expect(issues({ first_name: "  " })).toEqual(["first_name"]);
  });
});
