import { describe, expect, it } from "vitest";
import { commercialApplicationSchema } from "../src/commercial-application";
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
