/** Onboarding artisan en étapes (F-14). */

export const ONBOARDING_STEPS = [
  { key: "entreprise", available: true },
  { key: "metiers", available: true },
  { key: "zone", available: true },
  // Charte qualité de l'artisan (charter.ts), signée avant le dépôt des documents.
  { key: "charte", available: true },
  { key: "documents", available: true },
  { key: "profil", available: true },
  { key: "paiements", available: true },
  { key: "formule", available: true },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]["key"];

export const REQUIRED_DOCUMENT_TYPES = ["kbis", "decennale", "rc_pro", "identite"] as const;
export type RequiredDocumentType = (typeof REQUIRED_DOCUMENT_TYPES)[number];

/** Le Kbis (ou extrait INSEE/RNE) doit dater de moins de 3 mois (F-14). */
export const KBIS_MAX_AGE_MONTHS = 3;
export const PRESENTATION_MIN_LENGTH = 100;

export type DocumentSnapshot = {
  status: "en_attente" | "valide" | "refuse";
  /** Date d'émission (AAAA-MM-JJ), utilisée pour le Kbis. */
  dateEmission: string | null;
  /** Date de fin de validité (AAAA-MM-JJ). */
  dateFin: string | null;
};

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
  documents: Partial<Record<RequiredDocumentType, DocumentSnapshot>>;
  presentationLength: number;
  hasAvatar: boolean;
  /** Abonnement donnant accès au service (voir subscriptionGrantsAccess). */
  subscriptionActive: boolean;
  /** Compte Stripe Connect capable d'encaisser (charges_enabled). */
  connectChargesEnabled: boolean;
  /** Charte qualité signée dans sa version en cours (CHARTER_VERSION). */
  charterAccepted: boolean;
};

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthsBefore(date: Date, months: number): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, date.getUTCDate()),
  );
  return isoDay(d);
}

export function documentIsValid(
  type: RequiredDocumentType,
  doc: DocumentSnapshot | undefined,
  today: Date = new Date(),
): boolean {
  if (!doc || doc.status === "refuse") return false;
  const day = isoDay(today);
  switch (type) {
    case "kbis":
      return (
        doc.dateEmission !== null && doc.dateEmission >= monthsBefore(today, KBIS_MAX_AGE_MONTHS)
      );
    case "decennale":
    case "rc_pro":
      return doc.dateFin !== null && doc.dateFin >= day;
    case "identite":
      return doc.dateFin === null || doc.dateFin >= day;
  }
}

export function onboardingProgress(
  a: ArtisanOnboardingSnapshot,
  today: Date = new Date(),
): Record<OnboardingStep, boolean> {
  const zone =
    a.zoneMode === "rayon"
      ? a.hasBaseLocation && a.radiusKm !== null && a.radiusKm > 0
      : a.zoneMode === "communes" && a.communeCount > 0;
  return {
    entreprise: a.siretVerified && a.sireneActive && !!a.raisonSociale && a.assujettiTva !== null,
    metiers: a.tradeCount > 0,
    zone,
    charte: a.charterAccepted,
    documents: REQUIRED_DOCUMENT_TYPES.every((t) => documentIsValid(t, a.documents[t], today)),
    profil: a.hasAvatar && a.presentationLength >= PRESENTATION_MIN_LENGTH,
    paiements: a.connectChargesEnabled,
    formule: a.subscriptionActive,
  };
}

/** Envoi du dossier en vérification : étapes jusqu'au profil terminées, charte comprise (contrôle refait en base). */
export function canSubmitOnboarding(
  a: ArtisanOnboardingSnapshot,
  today: Date = new Date(),
): boolean {
  const p = onboardingProgress(a, today);
  return p.entreprise && p.metiers && p.zone && p.charte && p.documents && p.profil;
}

export function firstIncompleteStep(
  a: ArtisanOnboardingSnapshot,
  today: Date = new Date(),
): OnboardingStep {
  const progress = onboardingProgress(a, today);
  return ONBOARDING_STEPS.find((s) => !progress[s.key])?.key ?? "formule";
}

/**
 * État d'un document dans « Faire vérifier mon entreprise » (ADR 0111) : à ajouter, déposé
 * (en attente de vérification), vérifié, refusé, ou à refaire (date dépassée).
 */
export type DocumentState = "missing" | "en_attente" | "valide" | "refuse" | "a_refaire";

export function documentState(
  type: RequiredDocumentType,
  doc: DocumentSnapshot | undefined,
  today: Date = new Date(),
): DocumentState {
  if (!doc) return "missing";
  if (doc.status === "refuse") return "refuse";
  if (!documentIsValid(type, doc, today)) return "a_refaire";
  return doc.status;
}

/**
 * Éléments du dossier à terminer avant l'envoi (ADR 0111) : entreprise, métiers et zone (un seul
 * élément, faits à l'inscription), la charte, chaque document, puis le profil public.
 */
export const DOSSIER_ITEM_COUNT = 3 + REQUIRED_DOCUMENT_TYPES.length;

export function dossierItemsLeft(a: ArtisanOnboardingSnapshot, today: Date = new Date()): number {
  const p = onboardingProgress(a, today);
  const items = [p.entreprise && p.metiers && p.zone, p.charte, p.profil];
  const documents = REQUIRED_DOCUMENT_TYPES.map((t) => documentIsValid(t, a.documents[t], today));
  return [...items, ...documents].filter((done) => !done).length;
}
