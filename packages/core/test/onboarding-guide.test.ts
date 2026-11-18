import { describe, expect, it } from "vitest";
import type { ArtisanOnboardingSnapshot } from "../src/onboarding";
import {
  guideBlocks,
  guideMinutesLeft,
  guidePosition,
  guideStepPath,
  guideSteps,
  isGuideStepKey,
  nextGuideStep,
  previousGuideStep,
} from "../src/onboarding-guide";

const today = new Date("2026-11-18T12:00:00Z");

// Artisan qui sort de l'inscription : entreprise, métiers et zone faits, le reste à faire.
const inscrit: ArtisanOnboardingSnapshot = {
  siretVerified: true,
  sireneActive: true,
  raisonSociale: "ENTREPRISE EXEMPLE",
  assujettiTva: true,
  tradeCount: 1,
  zoneMode: "rayon",
  radiusKm: 20,
  hasBaseLocation: true,
  communeCount: 0,
  territoryCount: 0,
  documents: {},
  presentationLength: 0,
  hasAvatar: false,
  subscriptionActive: false,
  connectChargesEnabled: false,
  charterAccepted: false,
  decennaleExempt: false,
};
const depose = { status: "en_attente", dateEmission: "2026-11-01", dateFin: "2027-12-31" } as const;
const registre = { kbisFromRegistry: true };

describe("parcours guidé du dossier", () => {
  it("Kbis vérifié au registre : charte, quatre documents, fiche", () => {
    const steps = guideSteps(inscrit, registre, today);
    expect(steps.map((s) => s.key)).toEqual([
      "charte",
      "decennale",
      "rc_pro",
      "identite",
      "urssaf",
      "profil",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
    // Les 10 minutes annoncées : 2 + 4 × 1,5 + 2.
    expect(guideMinutesLeft(steps)).toBe(10);
    expect(guideBlocks(steps)).toEqual({
      charte: 2,
      documents: { count: 4, minutes: 6 },
      profil: 2,
    });
  });

  it("registre sans réponse : le Kbis redevient une étape", () => {
    const steps = guideSteps(inscrit, { kbisFromRegistry: false }, today);
    expect(steps.map((s) => s.key)).toContain("kbis");
    expect(guideBlocks(steps).documents).toEqual({ count: 5, minutes: 8 });
  });

  it("artisan non soumis à la décennale : elle sort du parcours", () => {
    const steps = guideSteps({ ...inscrit, decennaleExempt: true }, registre, today);
    expect(steps.map((s) => s.key)).not.toContain("decennale");
  });

  it("entreprise, métiers et zone n'y figurent que s'ils restent à terminer", () => {
    const steps = guideSteps({ ...inscrit, assujettiTva: null, tradeCount: 0 }, registre, today);
    expect(steps.slice(0, 3).map((s) => s.key)).toEqual(["entreprise", "metiers", "charte"]);
    expect(nextGuideStep(steps)).toBe("entreprise");
  });

  it("après une étape : la suivante qui reste à faire", () => {
    const steps = guideSteps(
      { ...inscrit, charterAccepted: true, documents: { rc_pro: depose } },
      registre,
      today,
    );
    expect(nextGuideStep(steps)).toBe("decennale");
    expect(nextGuideStep(steps, "charte")).toBe("decennale");
    // La RC Pro est déjà déposée : on passe à la pièce d'identité.
    expect(nextGuideStep(steps, "decennale")).toBe("identite");
    // Étape faite à l'inscription, absente du parcours : on repart du début.
    expect(nextGuideStep(steps, "zone")).toBe("decennale");
  });

  it("document passé : il n'est pas reproposé, la fin ramène au dossier", () => {
    const steps = guideSteps(
      { ...inscrit, charterAccepted: true, presentationLength: 120 },
      registre,
      today,
    );
    expect(nextGuideStep(steps, "urssaf")).toBeNull();
    expect(nextGuideStep(steps, "profil")).toBeNull();
    // « Mon dossier » reprend alors à la première pièce manquante.
    expect(nextGuideStep(steps)).toBe("decennale");
    expect(guideMinutesLeft(steps)).toBe(6);
  });

  it("document refusé ou périmé : à refaire", () => {
    const steps = guideSteps(
      {
        ...inscrit,
        documents: {
          decennale: { status: "refuse", dateEmission: null, dateFin: "2027-12-31" },
          rc_pro: { status: "en_attente", dateEmission: null, dateFin: "2026-01-01" },
        },
      },
      registre,
      today,
    );
    expect(steps.filter((s) => s.done)).toEqual([]);
  });

  it("position, retour et page de chaque étape", () => {
    const steps = guideSteps(inscrit, registre, today);
    expect(guidePosition(steps, "decennale")).toEqual({ index: 2, total: 6 });
    expect(guidePosition(steps, "kbis")).toBeNull();
    expect(previousGuideStep(steps, "decennale")).toBe("charte");
    expect(previousGuideStep(steps, "charte")).toBeNull();
    expect(guideStepPath("charte")).toBe("/pro/onboarding/charte");
    expect(guideStepPath("urssaf")).toBe("/pro/onboarding/documents?type=urssaf");
    expect(guideStepPath("profil")).toBe("/pro/onboarding/profil");
    expect(isGuideStepKey("rc_pro")).toBe(true);
    expect(isGuideStepKey("formule")).toBe(false);
  });
});
