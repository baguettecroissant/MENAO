import { describe, expect, it } from "vitest";
import {
  RADIUS_OPTIONS_KM,
  artisanSignUpSchema,
  certificationSchema,
  companyStepSchema,
  tradesStepSchema,
  zoneStepSchema,
} from "../src/artisan";
import { messages } from "../src/messages";

// Données fictives : SIRET inexistant dans Sirene (vérifié : 404), domaine .test, numéro ARCEP fiction.
const signup = {
  firstName: "Camille",
  lastName: "Exemple",
  phone: "06 39 98 00 02",
  email: "pro@example.test",
  password: "correct-horse-battery",
  siret: "000 000 018 00010",
  acceptTerms: true,
  acceptCgv: true,
  marketingOptIn: false,
};

describe("artisanSignUpSchema", () => {
  it("accepte une inscription valide et normalise SIRET et téléphone", () => {
    const r = artisanSignUpSchema.parse(signup);
    expect(r.siret).toBe("00000001800010");
    expect(r.phone).toBe("+33639980002");
  });

  it("téléphone obligatoire", () => {
    const r = artisanSignUpSchema.safeParse({ ...signup, phone: "" });
    expect(r.error?.issues[0]?.message).toBe(messages.phoneRequired);
  });

  it("SIRET avec mauvaise clé refusé", () => {
    const r = artisanSignUpSchema.safeParse({ ...signup, siret: "00000001800011" });
    expect(r.error?.issues[0]?.message).toBe(messages.siretInvalid);
  });

  it("CGV artisans obligatoires", () => {
    const r = artisanSignUpSchema.safeParse({ ...signup, acceptCgv: false });
    expect(r.error?.issues[0]?.message).toBe(messages.cgvRequired);
  });
});

describe("companyStepSchema", () => {
  it("nom commercial optionnel, choix de TVA obligatoire", () => {
    expect(companyStepSchema.parse({ assujettiTva: true }).nomCommercial).toBeUndefined();
    expect(companyStepSchema.safeParse({}).success).toBe(false);
  });

  it("raison sociale saisie : nettoyée", () => {
    expect(
      companyStepSchema.parse({ assujettiTva: false, raisonSociale: "  Exemple  " }).raisonSociale,
    ).toBe("Exemple");
  });

  it("chaîne vide = absent", () => {
    expect(
      companyStepSchema.parse({ assujettiTva: false, nomCommercial: "" }).nomCommercial,
    ).toBeUndefined();
  });
});

describe("tradesStepSchema", () => {
  it("au moins un métier", () => {
    const r = tradesStepSchema.safeParse({ tradeCodes: [], workTypeCodes: [], experienceYears: 3 });
    expect(r.error?.issues[0]?.message).toBe(messages.tradeRequired);
  });

  it("dédoublonne et accepte les spécialités", () => {
    const r = tradesStepSchema.parse({
      tradeCodes: ["electricien", "electricien"],
      workTypeCodes: ["tableau-electrique"],
      experienceYears: "12",
    });
    expect(r).toEqual({
      tradeCodes: ["electricien"],
      workTypeCodes: ["tableau-electrique"],
      experienceYears: 12,
    });
  });

  it("années d'expérience entre 0 et 80", () => {
    expect(
      tradesStepSchema.safeParse({
        tradeCodes: ["peintre"],
        workTypeCodes: [],
        experienceYears: 81,
      }).success,
    ).toBe(false);
  });
});

describe("certificationSchema", () => {
  const today = new Date("2026-10-09T12:00:00Z");

  it("accepte une certification valide", () => {
    const r = certificationSchema(today).parse({
      type: "rge",
      numero: " E-12345 ",
      dateFin: "2027-06-30",
    });
    expect(r).toEqual({ type: "rge", numero: "E-12345", dateFin: "2027-06-30" });
  });

  it("refuse une certification expirée", () => {
    const r = certificationSchema(today).safeParse({
      type: "qualibat",
      numero: "X1",
      dateFin: "2026-10-08",
    });
    expect(r.error?.issues[0]?.message).toBe(messages.dateExpired);
  });

  it("refuse un type inconnu ou une date mal formée", () => {
    expect(
      certificationSchema(today).safeParse({ type: "iso", numero: "X", dateFin: "2027-01-01" })
        .success,
    ).toBe(false);
    expect(
      certificationSchema(today).safeParse({ type: "rge", numero: "X", dateFin: "30/06/2027" })
        .success,
    ).toBe(false);
  });
});

describe("zoneStepSchema", () => {
  it("mode rayon : adresse géocodée et rayon de la liste", () => {
    const r = zoneStepSchema.parse({
      mode: "rayon",
      baseLabel: "Promenade des Anglais 06200 Nice",
      baseCitycode: "06088",
      lon: "7.240682",
      lat: "43.685969",
      radiusKm: "30",
    });
    expect(r).toMatchObject({ mode: "rayon", lon: 7.240682, lat: 43.685969, radiusKm: 30 });
  });

  it("mode rayon : rayon hors liste refusé", () => {
    expect(RADIUS_OPTIONS_KM).not.toContain(42);
    const r = zoneStepSchema.safeParse({
      mode: "rayon",
      baseLabel: "Nice",
      baseCitycode: "06088",
      lon: 7.2,
      lat: 43.7,
      radiusKm: 42,
    });
    expect(r.success).toBe(false);
  });

  it("mode rayon : coordonnées hors de France refusées", () => {
    const r = zoneStepSchema.safeParse({
      mode: "rayon",
      baseLabel: "Ailleurs",
      baseCitycode: "06088",
      lon: 120,
      lat: 10,
      radiusKm: 30,
    });
    expect(r.success).toBe(false);
  });

  it("mode communes : au moins une, codes INSEE valides, sans doublon", () => {
    const r = zoneStepSchema.parse({
      mode: "communes",
      communes: [
        { code: "06088", nom: "Nice" },
        { code: "06088", nom: "Nice" },
        { code: "2A004", nom: "Ajaccio" },
      ],
    });
    expect(r.mode === "communes" && r.communes).toHaveLength(2);
    expect(
      zoneStepSchema.safeParse({ mode: "communes", communes: [] }).error?.issues[0]?.message,
    ).toBe(messages.communesRequired);
    expect(
      zoneStepSchema.safeParse({ mode: "communes", communes: [{ code: "6088", nom: "Nice" }] })
        .success,
    ).toBe(false);
  });
});
