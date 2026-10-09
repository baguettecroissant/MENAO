import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  firstIncompleteStep,
  onboardingProgress,
  type ArtisanOnboardingSnapshot,
} from "../src/onboarding";

const vide: ArtisanOnboardingSnapshot = {
  siretVerified: false,
  sireneActive: false,
  raisonSociale: null,
  assujettiTva: null,
  tradeCount: 0,
  zoneMode: null,
  radiusKm: null,
  hasBaseLocation: false,
  communeCount: 0,
};

const entrepriseOk = {
  ...vide,
  siretVerified: true,
  sireneActive: true,
  raisonSociale: "ELECTRICITE EXEMPLE",
  assujettiTva: true,
};

describe("étapes d'onboarding (F-14)", () => {
  it("liste les 7 étapes de la spec, dans l'ordre", () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual([
      "entreprise",
      "metiers",
      "zone",
      "documents",
      "profil",
      "paiements",
      "formule",
    ]);
  });

  it("un compte vide commence par l'entreprise", () => {
    expect(firstIncompleteStep(vide)).toBe("entreprise");
  });

  it("entreprise incomplète si l'entreprise est fermée", () => {
    expect(onboardingProgress({ ...entrepriseOk, sireneActive: false }).entreprise).toBe(false);
  });

  it("entreprise incomplète sans raison sociale ou sans choix de TVA", () => {
    expect(onboardingProgress({ ...entrepriseOk, raisonSociale: null }).entreprise).toBe(false);
    expect(onboardingProgress({ ...entrepriseOk, assujettiTva: null }).entreprise).toBe(false);
  });

  it("enchaîne entreprise → métiers → zone", () => {
    expect(firstIncompleteStep(entrepriseOk)).toBe("metiers");
    expect(firstIncompleteStep({ ...entrepriseOk, tradeCount: 1 })).toBe("zone");
  });

  it("zone en rayon : adresse de base et rayon requis", () => {
    const base = { ...entrepriseOk, tradeCount: 1, zoneMode: "rayon" as const };
    expect(onboardingProgress({ ...base, radiusKm: 30 }).zone).toBe(false);
    expect(onboardingProgress({ ...base, radiusKm: 30, hasBaseLocation: true }).zone).toBe(true);
  });

  it("zone en communes : au moins une commune", () => {
    const base = { ...entrepriseOk, tradeCount: 1, zoneMode: "communes" as const };
    expect(onboardingProgress(base).zone).toBe(false);
    expect(onboardingProgress({ ...base, communeCount: 3 }).zone).toBe(true);
  });

  it("étapes 1 à 3 faites : la suivante est « documents »", () => {
    expect(
      firstIncompleteStep({
        ...entrepriseOk,
        tradeCount: 1,
        zoneMode: "communes",
        communeCount: 1,
      }),
    ).toBe("documents");
  });
});
