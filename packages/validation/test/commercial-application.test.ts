import { describe, expect, it } from "vitest";
import {
  commercialApplicationSchema,
  commercialApplicationSteps,
} from "../src/commercial-application";
import { messages } from "../src/messages";

const valid = {
  first_name: " Julie ",
  last_name: "Martin",
  email: "Julie.Martin@Example.com",
  phone: "06 39 98 00 21",
  sector: "Nice, Cagnes-sur-Mer",
  legal_status: "auto_entrepreneur",
  sees_artisans: "oui",
  experience: "plus_2_ans",
  availability: "temps_partiel",
  source: "linkedin",
  motivation: "",
  consent: true,
  linkedin_url: "",
  cv_path: "6f1d2c1e-8b1a-4c55-9d3e-2b7a1f0c9e11/0b6a3f6e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf",
};

describe("candidature d'un conseiller", () => {
  it("normalise une candidature complète", () => {
    const parsed = commercialApplicationSchema.parse(valid);
    expect(parsed).toMatchObject({
      first_name: "Julie",
      email: "julie.martin@example.com",
      phone: "+33639980021",
      sees_artisans: true,
      motivation: null,
    });
  });
  it("refuse un téléphone, un choix ou une provenance invalides", () => {
    const result = commercialApplicationSchema.safeParse({
      ...valid,
      phone: "123",
      experience: "10_ans",
      source: "tiktok",
      sees_artisans: "",
    });
    expect(result.success).toBe(false);
    const errors = result.error?.flatten().fieldErrors ?? {};
    expect(errors.phone).toEqual([messages.phoneInvalid]);
    expect(errors.experience).toEqual([messages.candidateChoice]);
    expect(errors.source).toEqual([messages.candidateChoice]);
    expect(errors.sees_artisans).toEqual([messages.candidateChoice]);
  });
  it("exige l'accord et un secteur", () => {
    const result = commercialApplicationSchema.safeParse({ ...valid, consent: false, sector: " " });
    const errors = result.error?.flatten().fieldErrors ?? {};
    expect(errors.consent).toEqual([messages.candidateConsent]);
    expect(errors.sector).toEqual([messages.candidateSector]);
  });
});

describe("CV, LinkedIn et étapes (ADR 0382)", () => {
  it("exige un CV rangé, au bon format", () => {
    const missing = commercialApplicationSchema.safeParse({ ...valid, cv_path: "" });
    expect(missing.error?.flatten().fieldErrors.cv_path).toEqual([messages.candidateCv]);
    expect(commercialApplicationSchema.safeParse({ ...valid, cv_path: "../cv.pdf" }).success).toBe(
      false,
    );
  });
  it("complète et contrôle le lien LinkedIn, facultatif", () => {
    expect(commercialApplicationSchema.parse(valid).linkedin_url).toBeNull();
    expect(
      commercialApplicationSchema.parse({ ...valid, linkedin_url: " linkedin.com/in/julie " })
        .linkedin_url,
    ).toBe("https://linkedin.com/in/julie");
    expect(
      commercialApplicationSchema.parse({
        ...valid,
        linkedin_url: "http://fr.linkedin.com/in/julie",
      }).linkedin_url,
    ).toBe("https://fr.linkedin.com/in/julie");
    const bad = commercialApplicationSchema.safeParse({
      ...valid,
      linkedin_url: "https://exemple.test",
    });
    expect(bad.error?.flatten().fieldErrors.linkedin_url).toEqual([messages.candidateLinkedin]);
  });
  it("contrôle chaque étape seule", () => {
    const [one, two, three] = commercialApplicationSteps;
    expect(one.safeParse(valid).success).toBe(true);
    expect(one.safeParse({ ...valid, email: "x" }).success).toBe(false);
    expect(two.safeParse(valid).success).toBe(true);
    expect(two.safeParse({ ...valid, source: "" }).success).toBe(false);
    expect(three.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
});
