import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  canSubmitOnboarding,
  documentIsValid,
  firstIncompleteStep,
  onboardingProgress,
  type ArtisanOnboardingSnapshot,
} from "../src/onboarding";

const today = new Date("2026-10-09T12:00:00Z");

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
  documents: {},
  presentationLength: 0,
  hasAvatar: false,
  subscriptionActive: false,
  connectChargesEnabled: false,
};

const entrepriseOk = {
  ...vide,
  siretVerified: true,
  sireneActive: true,
  raisonSociale: "ELECTRICITE EXEMPLE",
  assujettiTva: true,
};

describe("étapes d'onboarding (F-14)", () => {
  it("les 7 étapes sont disponibles", () => {
    expect(ONBOARDING_STEPS.every((s) => s.available)).toBe(true);
  });

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
      firstIncompleteStep(
        { ...entrepriseOk, tradeCount: 1, zoneMode: "communes", communeCount: 1 },
        today,
      ),
    ).toBe("documents");
  });
});

const etapes123 = {
  ...entrepriseOk,
  tradeCount: 1,
  zoneMode: "communes" as const,
  communeCount: 1,
};
const documentsOk = {
  kbis: { status: "en_attente" as const, dateEmission: "2026-08-01", dateFin: null },
  decennale: { status: "en_attente" as const, dateEmission: null, dateFin: "2027-01-01" },
  rc_pro: { status: "valide" as const, dateEmission: null, dateFin: "2027-01-01" },
  identite: { status: "en_attente" as const, dateEmission: null, dateFin: null },
};

describe("documents (F-14 étape 4)", () => {
  it("Kbis de moins de 3 mois", () => {
    expect(documentIsValid("kbis", documentsOk.kbis, today)).toBe(true);
    expect(
      documentIsValid("kbis", { ...documentsOk.kbis, dateEmission: "2026-07-09" }, today),
    ).toBe(true);
    expect(
      documentIsValid("kbis", { ...documentsOk.kbis, dateEmission: "2026-07-08" }, today),
    ).toBe(false);
    expect(documentIsValid("kbis", { ...documentsOk.kbis, dateEmission: null }, today)).toBe(false);
  });

  it("assurances : date de fin non dépassée", () => {
    expect(
      documentIsValid("decennale", { ...documentsOk.decennale, dateFin: "2026-10-09" }, today),
    ).toBe(true);
    expect(
      documentIsValid("decennale", { ...documentsOk.decennale, dateFin: "2026-10-08" }, today),
    ).toBe(false);
    expect(documentIsValid("rc_pro", { ...documentsOk.rc_pro, dateFin: null }, today)).toBe(false);
  });

  it("pièce d'identité : date d'expiration facultative mais non dépassée", () => {
    expect(documentIsValid("identite", documentsOk.identite, today)).toBe(true);
    expect(
      documentIsValid("identite", { ...documentsOk.identite, dateFin: "2020-01-01" }, today),
    ).toBe(false);
  });

  it("un document refusé ou absent ne compte pas", () => {
    expect(documentIsValid("kbis", { ...documentsOk.kbis, status: "refuse" }, today)).toBe(false);
    expect(documentIsValid("kbis", undefined, today)).toBe(false);
  });

  it("étape documents terminée avec les 4 documents valides", () => {
    expect(onboardingProgress({ ...etapes123, documents: documentsOk }, today).documents).toBe(
      true,
    );
    const { identite: _absent, ...sansIdentite } = documentsOk;
    expect(onboardingProgress({ ...etapes123, documents: sansIdentite }, today).documents).toBe(
      false,
    );
  });
});

describe("profil public et envoi en vérification", () => {
  const complet = {
    ...etapes123,
    documents: documentsOk,
    presentationLength: 120,
    hasAvatar: true,
  };

  it("profil : photo et présentation d'au moins 100 caractères", () => {
    expect(onboardingProgress(complet, today).profil).toBe(true);
    expect(onboardingProgress({ ...complet, presentationLength: 99 }, today).profil).toBe(false);
    expect(onboardingProgress({ ...complet, hasAvatar: false }, today).profil).toBe(false);
  });

  it("envoi possible quand les étapes 1 à 5 sont terminées", () => {
    expect(canSubmitOnboarding(complet, today)).toBe(true);
    expect(canSubmitOnboarding({ ...complet, tradeCount: 0 }, today)).toBe(false);
    expect(firstIncompleteStep(complet, today)).toBe("paiements");
  });

  it("étape « paiements » terminée quand le compte Stripe peut encaisser", () => {
    expect(onboardingProgress({ ...complet, connectChargesEnabled: true }, today).paiements).toBe(
      true,
    );
  });

  it("étape « formule » terminée avec un abonnement actif", () => {
    expect(onboardingProgress(complet, today).formule).toBe(false);
    expect(onboardingProgress({ ...complet, subscriptionActive: true }, today).formule).toBe(true);
  });
});
