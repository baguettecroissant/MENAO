import { describe, expect, it } from "vitest";
import {
  RECRUITMENT_PUBLISHED_RATES,
  RECRUITMENT_SIMULATION_DEFAULT,
  RECRUITMENT_SIMULATION_MAX,
  clampSimulation,
  interviewAverage,
  isMeetingUrl,
  maxSubscriptionCents,
  normalizeInterviewGrid,
  recruitmentFilter,
  recruitmentRates,
  recruitmentSourceFromParam,
  simulateRecruitmentEarnings,
} from "../src/recruitment";

describe("provenance du candidat", () => {
  it("lit le paramètre d'une annonce, avec ses variantes", () => {
    expect(recruitmentSourceFromParam("LinkedIn")).toBe("linkedin");
    expect(recruitmentSourceFromParam(" fb ")).toBe("facebook");
    expect(recruitmentSourceFromParam("lbc")).toBe("leboncoin");
    expect(recruitmentSourceFromParam("bouche-a-oreille")).toBe("bouche_a_oreille");
  });
  it("ignore une provenance inconnue ou absente", () => {
    expect(recruitmentSourceFromParam("tiktok")).toBeNull();
    expect(recruitmentSourceFromParam("")).toBeNull();
    expect(recruitmentSourceFromParam(undefined)).toBeNull();
  });
});

describe("barème", () => {
  it("reprend le barème annoncé tant que rien n'est réglé", () => {
    expect(recruitmentRates(null)).toEqual(RECRUITMENT_PUBLISHED_RATES);
    expect(
      recruitmentRates({
        prime_validation_centimes: 11_000,
        prime_abonnement_centimes: null,
        prime_abonnement_premium_centimes: 10_000,
        prime_abonnement_entreprise_centimes: 20_000,
      }),
    ).toEqual(RECRUITMENT_PUBLISHED_RATES);
  });
  it("lit le back-office, Premium et Ultimate vides reprenant Base", () => {
    const rates = recruitmentRates({
      prime_validation_centimes: 12_000,
      prime_abonnement_centimes: 4_000,
      prime_abonnement_premium_centimes: null,
      prime_abonnement_entreprise_centimes: 25_000,
    });
    expect(rates).toEqual({
      validationCents: 12_000,
      subscriptionCents: { base: 4_000, premium: 4_000, entreprise: 25_000 },
    });
    expect(maxSubscriptionCents(rates)).toBe(25_000);
  });
});

describe("simulateur de gains", () => {
  it("calcule l'exemple de la page : 12 validés, 4 en Base, 2 en Premium = 1 640 €", () => {
    const { lines, totalCents } = simulateRecruitmentEarnings(
      RECRUITMENT_SIMULATION_DEFAULT,
      RECRUITMENT_PUBLISHED_RATES,
    );
    expect(totalCents).toBe(164_000);
    expect(lines.map((l) => [l.kind, l.count, l.totalCents])).toEqual([
      ["validation", 12, 132_000],
      ["base", 4, 12_000],
      ["premium", 2, 20_000],
    ]);
  });
  it("ne compte jamais plus d'abonnés que d'artisans validés", () => {
    expect(
      clampSimulation({ validated: 3, subscribers: { base: 2, premium: 5, entreprise: 1 } }),
    ).toEqual({ validated: 3, subscribers: { base: 2, premium: 1, entreprise: 0 } });
  });
  it("borne et arrondit les valeurs", () => {
    const sim = clampSimulation({
      validated: 99.7,
      subscribers: { base: -2, premium: Number.NaN, entreprise: 1.9 },
    });
    expect(sim).toEqual({
      validated: RECRUITMENT_SIMULATION_MAX,
      subscribers: { base: 0, premium: 0, entreprise: 1 },
    });
  });
  it("garde la ligne de validation même à zéro", () => {
    const { lines, totalCents } = simulateRecruitmentEarnings(
      { validated: 0, subscribers: { base: 0, premium: 0, entreprise: 0 } },
      RECRUITMENT_PUBLISHED_RATES,
    );
    expect(lines).toHaveLength(1);
    expect(totalCents).toBe(0);
  });
});

describe("grille d'entretien", () => {
  it("garde les notes entières de 1 à 5 des critères connus", () => {
    expect(
      normalizeInterviewGrid({ presentation: 4, ecoute: "5", telephone: 0, motivation: 3.5, x: 2 }),
    ).toEqual({ presentation: 4, ecoute: 5 });
    expect(normalizeInterviewGrid(null)).toEqual({});
    expect(normalizeInterviewGrid([1, 2])).toEqual({});
  });
  it("donne la moyenne à une décimale", () => {
    expect(interviewAverage({})).toBeNull();
    expect(
      interviewAverage({
        presentation: 4,
        ecoute: 5,
        connaissance: 4,
        telephone: 3,
        motivation: 4,
        disponibilite: 4,
      }),
    ).toBe(4);
    expect(interviewAverage({ presentation: 4, ecoute: 5, telephone: 4 })).toBe(4.3);
  });
});

describe("divers", () => {
  it("filtre par défaut : tous", () => {
    expect(recruitmentFilter("reunion")).toBe("reunion");
    expect(recruitmentFilter("inconnu")).toBe("tous");
    expect(recruitmentFilter(null)).toBe("tous");
  });
  it("accepte un lien de visio https seulement", () => {
    expect(isMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isMeetingUrl("http://meet.google.com/abc")).toBe(false);
    expect(isMeetingUrl("meet.google.com/abc")).toBe(false);
    expect(isMeetingUrl("https://")).toBe(false);
  });
});
