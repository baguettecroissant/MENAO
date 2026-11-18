import { describe, expect, it } from "vitest";
import {
  attestationsProgress,
  canSubmitOnboarding,
  type ArtisanOnboardingSnapshot,
} from "../src/onboarding";
import {
  guideBlocks,
  guideMinutes,
  guidePosition,
  guideSendSteps,
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
const keys = (steps: { key: string }[]) => steps.map((s) => s.key);

describe("parcours guidé de l'inscription (ADR 0376)", () => {
  it("Kbis vérifié au registre : six étapes, la formule en quatrième", () => {
    const steps = guideSteps(inscrit, registre, today);
    expect(keys(steps)).toEqual([
      "charte",
      "identite",
      "profil",
      "formule",
      "attestations",
      "paiements",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
    // Environ 5 minutes pour envoyer : 2 + 1 + 1,5.
    expect(keys(guideSendSteps(steps))).toEqual(["charte", "identite", "profil"]);
    expect(guideMinutes(guideSendSteps(steps))).toBe(5);
    expect(guideBlocks(steps)).toEqual({
      charte: 2,
      documents: { count: 1, minutes: 1 },
      profil: 2,
    });
  });

  it("registre sans réponse : le Kbis redevient une étape de l'envoi", () => {
    const steps = guideSteps(inscrit, { kbisFromRegistry: false }, today);
    expect(keys(guideSendSteps(steps))).toEqual(["charte", "kbis", "identite", "profil"]);
    expect(guideBlocks(steps).documents).toEqual({ count: 2, minutes: 2 });
  });

  it("application : pas d'étape formule (règle 10)", () => {
    const steps = guideSteps(inscrit, { ...registre, withPlan: false }, today);
    expect(keys(steps)).toEqual(["charte", "identite", "profil", "attestations", "paiements"]);
  });

  it("entreprise, métiers et zone n'y figurent que s'ils restent à terminer", () => {
    const steps = guideSteps({ ...inscrit, assujettiTva: null, tradeCount: 0 }, registre, today);
    expect(keys(steps).slice(0, 3)).toEqual(["entreprise", "metiers", "charte"]);
    expect(nextGuideStep(steps)).toBe("entreprise");
  });

  it("le dossier peut partir sans les attestations, qui restent à faire", () => {
    const pret = {
      ...inscrit,
      charterAccepted: true,
      presentationLength: 120,
      documents: { kbis: depose, identite: depose },
    };
    expect(canSubmitOnboarding(pret, today)).toBe(true);
    const steps = guideSteps(pret, registre, today);
    expect(nextGuideStep(steps)).toBe("formule");
    // « Plus tard » sur la formule : les attestations, puis les paiements.
    expect(nextGuideStep(steps, "formule")).toBe("attestations");
    expect(nextGuideStep(steps, "attestations")).toBe("paiements");
    expect(nextGuideStep(steps, "paiements")).toBeNull();
  });

  it("attestations : faites quand les trois sont déposées, deux pour un artisan non soumis", () => {
    const deux = { ...inscrit, documents: { rc_pro: depose, urssaf: depose } };
    expect(attestationsProgress(deux, today)).toEqual({ done: 2, total: 3 });
    expect(guideSteps(deux, registre, today).find((s) => s.key === "attestations")?.done).toBe(
      false,
    );
    const nonSoumis = { ...deux, decennaleExempt: true };
    expect(attestationsProgress(nonSoumis, today)).toEqual({ done: 2, total: 2 });
    expect(guideSteps(nonSoumis, registre, today).find((s) => s.key === "attestations")?.done).toBe(
      true,
    );
    // Attestation refusée ou périmée : à refaire.
    const refusee = {
      ...inscrit,
      documents: { rc_pro: { status: "refuse", dateEmission: null, dateFin: "2027-12-31" } },
    } as ArtisanOnboardingSnapshot;
    expect(attestationsProgress(refusee, today).done).toBe(0);
  });

  it("formule et paiements : faits avec l'abonnement et le compte Stripe", () => {
    const steps = guideSteps(
      { ...inscrit, subscriptionActive: true },
      { ...registre, paymentsStarted: true },
      today,
    );
    expect(steps.find((s) => s.key === "formule")?.done).toBe(true);
    // Compte transmis à Stripe, en cours de vérification : l'étape ne revient pas.
    expect(steps.find((s) => s.key === "paiements")?.done).toBe(true);
  });

  it("position, retour et page de chaque étape", () => {
    const steps = guideSteps(inscrit, registre, today);
    expect(guidePosition(steps, "identite")).toEqual({ index: 2, total: 6 });
    expect(guidePosition(steps, "kbis")).toBeNull();
    expect(previousGuideStep(steps, "formule")).toBe("profil");
    expect(previousGuideStep(steps, "charte")).toBeNull();
    expect(guideStepPath("charte")).toBe("/pro/onboarding/charte");
    expect(guideStepPath("identite")).toBe("/pro/onboarding/documents?type=identite");
    expect(guideStepPath("attestations")).toBe("/pro/onboarding/attestations");
    expect(guideStepPath("formule")).toBe("/pro/onboarding/formule");
    expect(isGuideStepKey("paiements")).toBe(true);
    expect(isGuideStepKey("decennale")).toBe(false);
  });
});
