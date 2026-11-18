import {
  SEND_DOCUMENT_TYPES,
  attestationsProgress,
  documentIsValid,
  onboardingProgress,
  type ArtisanOnboardingSnapshot,
} from "./onboarding";

/**
 * Parcours guidé de l'inscription (ADR 0373, 0376) : une étape par écran, dans un ordre fixe, et
 * après chacune la suivante qui reste à faire. D'abord ce que l'artisan a toujours sous la main
 * (charte, pièce d'identité, fiche) : le dossier part alors à l'équipe. Puis la formule, les trois
 * attestations, et les paiements. Tout est obligatoire pour être en ligne, rien ne bloque la suite.
 */
export type GuideStepKey =
  | "entreprise"
  | "metiers"
  | "zone"
  | "charte"
  | "kbis"
  | "identite"
  | "profil"
  | "formule"
  | "attestations"
  | "paiements";

export type GuideStep = { key: GuideStepKey; done: boolean; seconds: number };

export const GUIDE_ORDER: readonly GuideStepKey[] = [
  "entreprise",
  "metiers",
  "zone",
  "charte",
  "kbis",
  "identite",
  "profil",
  "formule",
  "attestations",
  "paiements",
];

const PROFILE_KEYS = ["entreprise", "metiers", "zone"] as const;
/** Étapes qui suffisent à envoyer le dossier ; les suivantes mènent à la mise en ligne. */
const SEND_KEYS: readonly GuideStepKey[] = [
  ...PROFILE_KEYS,
  "charte",
  ...SEND_DOCUMENT_TYPES,
  "profil",
];

/** Durées indicatives, en secondes. */
export const GUIDE_SECONDS = {
  profileStep: 60,
  charte: 120,
  document: 60,
  profil: 90,
  formule: 120,
  attestation: 90,
  paiements: 300,
} as const;

export function isGuideStepKey(value: unknown): value is GuideStepKey {
  return typeof value === "string" && (GUIDE_ORDER as readonly string[]).includes(value);
}

export type GuideOptions = {
  /** Kbis vérifié au registre (ADR 0217) : il sort du parcours. */
  kbisFromRegistry: boolean;
  /** Compte Stripe déjà transmis, en cours de vérification : l'étape « paiements » est faite. */
  paymentsStarted?: boolean;
  /** `false` dans l'application : pas d'achat d'abonnement (règle 10), l'étape « formule » saute. */
  withPlan?: boolean;
};

/**
 * Étapes du parcours pour cet artisan. L'entreprise, les métiers et la zone, faits à
 * l'inscription, n'y figurent que s'ils restent à terminer.
 */
export function guideSteps(
  a: ArtisanOnboardingSnapshot,
  options: GuideOptions,
  today: Date = new Date(),
): GuideStep[] {
  const p = onboardingProgress(a, today);
  const attestations = attestationsProgress(a, today);
  return [
    ...PROFILE_KEYS.filter((key) => !p[key]).map((key) => ({
      key,
      done: false,
      seconds: GUIDE_SECONDS.profileStep,
    })),
    { key: "charte" as const, done: p.charte, seconds: GUIDE_SECONDS.charte },
    ...SEND_DOCUMENT_TYPES.filter((type) => type !== "kbis" || !options.kbisFromRegistry).map(
      (type) => ({
        key: type,
        done: documentIsValid(type, a.documents[type], today),
        seconds: GUIDE_SECONDS.document,
      }),
    ),
    { key: "profil" as const, done: p.profil, seconds: GUIDE_SECONDS.profil },
    ...(options.withPlan === false
      ? []
      : [{ key: "formule" as const, done: p.formule, seconds: GUIDE_SECONDS.formule }]),
    {
      key: "attestations" as const,
      done: attestations.done === attestations.total,
      seconds: GUIDE_SECONDS.attestation * (attestations.total - attestations.done || 1),
    },
    {
      key: "paiements" as const,
      done: p.paiements || options.paymentsStarted === true,
      seconds: GUIDE_SECONDS.paiements,
    },
  ];
}

/**
 * Étape suivante : la première qui reste à faire après `after` (ou la première tout court sans
 * `after`). `null` à la fin du parcours : retour à « Mon inscription », qui liste ce qui a été
 * passé.
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

/** Les étapes qui suffisent à envoyer le dossier (les autres mènent à la mise en ligne). */
export function guideSendSteps(steps: readonly GuideStep[]): GuideStep[] {
  return steps.filter((step) => SEND_KEYS.includes(step.key));
}

/** Page d'une étape du parcours, sur le site. */
export function guideStepPath(key: GuideStepKey): string {
  if (key === "kbis" || key === "identite") return `/pro/onboarding/documents?type=${key}`;
  return `/pro/onboarding/${key}`;
}

/**
 * Les trois blocs annoncés sur « Votre profil est créé » : la charte, les documents de l'envoi
 * (pièce d'identité, et Kbis si le registre ne l'a pas vérifié), la fiche.
 */
export function guideBlocks(steps: readonly GuideStep[]): {
  charte: number;
  documents: { count: number; minutes: number };
  profil: number;
} {
  const documents = steps.filter((step) =>
    (SEND_DOCUMENT_TYPES as readonly GuideStepKey[]).includes(step.key),
  );
  return {
    charte: guideMinutes(steps.filter((step) => step.key === "charte")),
    documents: { count: documents.length, minutes: guideMinutes(documents) },
    profil: guideMinutes(steps.filter((step) => step.key === "profil")),
  };
}
