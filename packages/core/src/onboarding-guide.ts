import {
  documentIsValid,
  onboardingProgress,
  requiredDocumentTypes,
  type ArtisanOnboardingSnapshot,
  type RequiredDocumentType,
} from "./onboarding";

/**
 * Parcours guidé du dossier d'inscription (ADR 0373) : une étape par écran, dans un ordre fixe,
 * et après chacune la suivante qui reste à faire. « Mon dossier » garde la vue d'ensemble.
 */
export type GuideStepKey =
  "entreprise" | "metiers" | "zone" | "charte" | RequiredDocumentType | "profil";

export type GuideStep = { key: GuideStepKey; done: boolean; seconds: number };

/** Ordre du parcours : le profil créé à l'inscription, la charte, les documents, puis la fiche. */
export const GUIDE_ORDER: readonly GuideStepKey[] = [
  "entreprise",
  "metiers",
  "zone",
  "charte",
  "kbis",
  "decennale",
  "rc_pro",
  "identite",
  "urssaf",
  "profil",
];

const PROFILE_KEYS = ["entreprise", "metiers", "zone"] as const;

/** Durées indicatives, en secondes : 2 min la charte, 1 min 30 par document, 2 min la fiche. */
export const GUIDE_SECONDS = { profileStep: 60, charte: 120, document: 90, profil: 120 } as const;

export function isGuideStepKey(value: unknown): value is GuideStepKey {
  return typeof value === "string" && (GUIDE_ORDER as readonly string[]).includes(value);
}

/**
 * Étapes du parcours pour cet artisan. L'entreprise, les métiers et la zone, faits à
 * l'inscription, n'y figurent que s'ils restent à terminer ; le Kbis disparaît quand le registre
 * l'a vérifié (ADR 0217) ; la décennale aussi pour un artisan « non soumis » (ADR 0116).
 */
export function guideSteps(
  a: ArtisanOnboardingSnapshot,
  options: { kbisFromRegistry: boolean },
  today: Date = new Date(),
): GuideStep[] {
  const p = onboardingProgress(a, today);
  const documents = requiredDocumentTypes(a).filter(
    (type) => type !== "kbis" || !options.kbisFromRegistry,
  );
  return [
    ...PROFILE_KEYS.filter((key) => !p[key]).map((key) => ({
      key,
      done: false,
      seconds: GUIDE_SECONDS.profileStep,
    })),
    { key: "charte" as const, done: p.charte, seconds: GUIDE_SECONDS.charte },
    ...documents.map((type) => ({
      key: type,
      done: documentIsValid(type, a.documents[type], today),
      seconds: GUIDE_SECONDS.document,
    })),
    { key: "profil" as const, done: p.profil, seconds: GUIDE_SECONDS.profil },
  ];
}

/**
 * Étape suivante : la première qui reste à faire après `after` (ou la première tout court sans
 * `after`). `null` à la fin du parcours : retour à « Mon dossier », qui liste ce qui a été passé.
 */
export function nextGuideStep(
  steps: readonly GuideStep[],
  after: GuideStepKey | null = null,
): GuideStepKey | null {
  const from = after ? GUIDE_ORDER.indexOf(after) : -1;
  return steps.find((step) => !step.done && GUIDE_ORDER.indexOf(step.key) > from)?.key ?? null;
}

/** Étape précédente du parcours, faite ou non (bouton « Retour ») ; `null` sur la première. */
export function previousGuideStep(
  steps: readonly GuideStep[],
  key: GuideStepKey,
): GuideStepKey | null {
  const index = steps.findIndex((step) => step.key === key);
  return index > 0 ? (steps[index - 1]?.key ?? null) : null;
}

/** « Étape 2 sur 6 » ; `null` pour une étape hors du parcours (Kbis vérifié au registre…). */
export function guidePosition(
  steps: readonly GuideStep[],
  key: GuideStepKey,
): { index: number; total: number } | null {
  const index = steps.findIndex((step) => step.key === key);
  return index < 0 ? null : { index: index + 1, total: steps.length };
}

/** Minutes à prévoir pour ces étapes, arrondies à la minute supérieure. */
export function guideMinutes(steps: readonly GuideStep[]): number {
  return Math.ceil(steps.reduce((sum, step) => sum + step.seconds, 0) / 60);
}

/** « Encore 8 min » : ce qui reste à faire. */
export function guideMinutesLeft(steps: readonly GuideStep[]): number {
  return guideMinutes(steps.filter((step) => !step.done));
}

/** Page d'une étape du parcours. */
export function guideStepPath(key: GuideStepKey): string {
  if (key === "entreprise" || key === "metiers" || key === "zone" || key === "charte")
    return `/pro/onboarding/${key}`;
  if (key === "profil") return "/pro/onboarding/profil";
  return `/pro/onboarding/documents?type=${key}`;
}

/** Les trois blocs annoncés sur « Votre profil est créé » : charte, documents, fiche. */
export function guideBlocks(steps: readonly GuideStep[]): {
  charte: number;
  documents: { count: number; minutes: number };
  profil: number;
} {
  const others: readonly GuideStepKey[] = [...PROFILE_KEYS, "charte", "profil"];
  const documents = steps.filter((step) => !others.includes(step.key));
  return {
    charte: guideMinutes(steps.filter((step) => step.key === "charte")),
    documents: { count: documents.length, minutes: guideMinutes(documents) },
    profil: guideMinutes(steps.filter((step) => step.key === "profil")),
  };
}
