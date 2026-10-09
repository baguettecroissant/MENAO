/** Onboarding artisan en étapes (F-14). Les étapes 4 à 7 arrivent dans les PR suivantes. */

export const ONBOARDING_STEPS = [
  { key: "entreprise", available: true },
  { key: "metiers", available: true },
  { key: "zone", available: true },
  { key: "documents", available: false },
  { key: "profil", available: false },
  { key: "paiements", available: false },
  { key: "formule", available: false },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]["key"];

/** Données de l'artisan nécessaires pour savoir quelles étapes sont terminées. */
export type ArtisanOnboardingSnapshot = {
  siretVerified: boolean;
  sireneActive: boolean;
  raisonSociale: string | null;
  assujettiTva: boolean | null;
  tradeCount: number;
  zoneMode: "rayon" | "communes" | null;
  radiusKm: number | null;
  hasBaseLocation: boolean;
  communeCount: number;
};

export function onboardingProgress(a: ArtisanOnboardingSnapshot): Record<OnboardingStep, boolean> {
  const zone =
    a.zoneMode === "rayon"
      ? a.hasBaseLocation && a.radiusKm !== null && a.radiusKm > 0
      : a.zoneMode === "communes" && a.communeCount > 0;
  return {
    entreprise: a.siretVerified && a.sireneActive && !!a.raisonSociale && a.assujettiTva !== null,
    metiers: a.tradeCount > 0,
    zone,
    documents: false,
    profil: false,
    paiements: false,
    formule: false,
  };
}

export function firstIncompleteStep(a: ArtisanOnboardingSnapshot): OnboardingStep {
  const progress = onboardingProgress(a);
  return ONBOARDING_STEPS.find((s) => !progress[s.key])?.key ?? "formule";
}
