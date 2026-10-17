import { describe, expect, it } from "vitest";
import {
  artisanAccountSchema,
  artisanOAuthAccountSchema,
  artisanSignupProfileSchema,
  emailCodeSchema,
} from "../src/artisan-signup";
import { messages } from "../src/messages";

// Données fictives : SIRET inexistant dans Sirene (vérifié : 404), domaine .test, numéro ARCEP fiction.
const profile = {
  tradeCodes: ["plombier", "chauffagiste", "plombier"],
  siret: "000 000 018 00010",
  isDirigeant: true,
  assujettiTva: false,
  zone: {
    mode: "rayon",
    baseLabel: "12 Avenue des Oliviers 06100 Nice",
    baseCitycode: "06088",
    lon: 7.26,
    lat: 43.72,
    radiusKm: 20,
  },
};

const account = {
  firstName: "Camille",
  lastName: "Exemple",
  phone: "06 39 98 00 02",
  email: "pro@example.test",
  password: "correct-horse-battery",
  acceptTerms: true,
  acceptCgv: true,
  marketingOptIn: false,
};

describe("artisanSignupProfileSchema", () => {
  it("accepte le parcours et normalise SIRET et métiers", () => {
    const r = artisanSignupProfileSchema.parse(profile);
    expect(r.siret).toBe("00000001800010");
    expect(r.tradeCodes).toEqual(["plombier", "chauffagiste"]);
  });

  it("au moins un métier", () => {
    const r = artisanSignupProfileSchema.safeParse({ ...profile, tradeCodes: [] });
    expect(r.error?.issues[0]?.message).toBe(messages.tradeRequired);
  });

  it("SIRET avec mauvaise clé refusé", () => {
    const r = artisanSignupProfileSchema.safeParse({ ...profile, siret: "00000001800011" });
    expect(r.error?.issues[0]?.message).toBe(messages.siretInvalid);
  });

  it("rayon parmi les choix proposés", () => {
    const r = artisanSignupProfileSchema.safeParse({
      ...profile,
      zone: { ...profile.zone, radiusKm: 42 },
    });
    expect(r.error?.issues[0]?.message).toBe(messages.radiusInvalid);
  });

  it("réponses dirigeant et TVA obligatoires", () => {
    expect(artisanSignupProfileSchema.safeParse({ ...profile, isDirigeant: null }).success).toBe(
      false,
    );
    expect(
      artisanSignupProfileSchema.safeParse({ ...profile, assujettiTva: undefined }).success,
    ).toBe(false);
  });
});

describe("artisanAccountSchema", () => {
  it("accepte un compte valide et normalise le téléphone", () => {
    expect(artisanAccountSchema.parse(account).phone).toBe("+33639980002");
  });

  it("téléphone obligatoire", () => {
    const r = artisanAccountSchema.safeParse({ ...account, phone: "" });
    expect(r.error?.issues[0]?.message).toBe(messages.phoneRequired);
  });

  it("CGV artisans obligatoires", () => {
    const r = artisanAccountSchema.safeParse({ ...account, acceptCgv: false });
    expect(r.error?.issues[0]?.message).toBe(messages.cgvRequired);
  });
});

describe("artisanOAuthAccountSchema", () => {
  it("sans adresse ni mot de passe, téléphone et CGV obligatoires", () => {
    const { email: _e, password: _p, ...oauth } = account;
    expect(artisanOAuthAccountSchema.parse(oauth).phone).toBe("+33639980002");
    expect(artisanOAuthAccountSchema.safeParse({ ...oauth, phone: "" }).success).toBe(false);
    expect(artisanOAuthAccountSchema.safeParse({ ...oauth, acceptCgv: false }).success).toBe(false);
  });
});

describe("emailCodeSchema", () => {
  it("garde les 6 chiffres", () => {
    expect(emailCodeSchema.parse({ email: " Pro@Example.test", code: "123 456" })).toEqual({
      email: "pro@example.test",
      code: "123456",
    });
    expect(
      emailCodeSchema.safeParse({ email: "pro@example.test", code: "12345" }).error?.issues[0]
        ?.message,
    ).toBe(messages.emailCodeInvalid);
  });
});
