import { addDays } from "./agenda";

/**
 * « Bien démarrer » des conseillers (F-194, lot 83, ADR 0394) : les étapes de l'arrivée d'un agent
 * commercial (statut, téléphone, formation, premier prospect), le badge « Prêt pour le terrain » et
 * l'attestation de vigilance Urssaf à renouveler tous les 6 mois (contrat d'agent commercial).
 * Agents indépendants : le badge ne bloque rien (ni code, ni primes, ni tournée), c'est un repère.
 */

/** Modules de formation à quiz, dans l'ordre ; le simulateur de vente fait le sixième. */
export const FORMATION_MODULES = ["menao", "parcours", "objections", "offre", "regles"] as const;
export type FormationModule = (typeof FORMATION_MODULES)[number];

export const isFormationModule = (value: unknown): value is FormationModule =>
  typeof value === "string" && (FORMATION_MODULES as readonly string[]).includes(value);

/** Questions par quiz, et bonnes réponses qu'il faut pour réussir le module. */
export const FORMATION_QUIZ_LENGTH = 5;
export const FORMATION_PASS_SCORE = 4;
/** Note du simulateur de vente (sur 20) qui valide la formation. */
export const SIMULATOR_PASS_SCORE = 14;
/** Attestation de vigilance Urssaf : valable 6 mois, rappel 15 jours avant la fin. */
export const URSSAF_VALIDITY_MONTHS = 6;
export const URSSAF_REMINDER_DAYS = 15;
export const RSAC_NUMBER_MAX_LENGTH = 40;
export const RSAC_GREFFE_MAX_LENGTH = 80;

export const formationModulePassed = (score: number | null | undefined) =>
  typeof score === "number" && score >= FORMATION_PASS_SCORE;

/** Note d'un quiz : nombre de réponses égales à la clé (réponse absente ou en trop : fausse). */
export function gradeQuiz(answers: readonly number[], keys: readonly number[]): number {
  return keys.reduce((total, key, i) => total + (answers[i] === key ? 1 : 0), 0);
}

/** AAAA-MM-JJ décalé de `months` mois ; fin de mois ramenée au dernier jour (31 août + 6 → 28 fév.). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type UrssafState = "manquante" | "valide" | "bientot" | "expiree";

/** État de l'attestation Urssaf à une date : à déposer, valable, à renouveler bientôt, expirée. */
export function urssafStatus(
  depositedOn: string | null,
  today: string,
): { state: UrssafState; expiresOn: string | null } {
  if (!depositedOn) return { state: "manquante", expiresOn: null };
  const expiresOn = addMonths(depositedOn, URSSAF_VALIDITY_MONTHS);
  if (today >= expiresOn) return { state: "expiree", expiresOn };
  if (today >= addDays(expiresOn, -URSSAF_REMINDER_DAYS)) return { state: "bientot", expiresOn };
  return { state: "valide", expiresOn };
}

/** Données brutes de l'arrivée d'un conseiller (lues par `commercial_onboarding_state`). */
export type CommercialOnboardingRaw = {
  contractSignedOn: string | null;
  rsacNumber: string | null;
  urssafDepositedOn: string | null;
  ribDepositedOn: string | null;
  homeScreenOn: string | null;
  /** Rappels par e-mail (bilan du lundi, attestation) : activés sauf refus dans « Communications ». */
  remindersOn: boolean;
  /** Meilleure note de chaque quiz réussi ou non. */
  modules: Partial<Record<FormationModule, number>>;
  /** Meilleure note au simulateur de vente, null s'il n'a pas servi. */
  bestTraining: number | null;
  /** Au moins une fiche de préparation faite avec le copilote. */
  firstBrief: boolean;
};

export type CommercialStepGroup = "statut" | "telephone" | "formation" | "prospect";
export type CommercialStepKey =
  | "contrat"
  | "rsac"
  | "urssaf"
  | "rib"
  | "ecran"
  | "rappels"
  | `module_${FormationModule}`
  | "simulateur"
  | "premier_prospect";

export type CommercialStep = {
  key: CommercialStepKey;
  group: CommercialStepGroup;
  done: boolean;
  /** Pour un quiz ou le simulateur : la meilleure note, sinon null. */
  score: number | null;
};

export const COMMERCIAL_STEP_GROUPS: readonly CommercialStepGroup[] = [
  "statut",
  "telephone",
  "formation",
  "prospect",
];

/** Les 13 étapes, dans l'ordre de la page. L'Urssaf compte faite tant qu'elle n'a pas expiré. */
export function commercialOnboardingSteps(
  raw: CommercialOnboardingRaw,
  today: string,
): CommercialStep[] {
  const urssaf = urssafStatus(raw.urssafDepositedOn, today).state;
  const step = (
    key: CommercialStepKey,
    group: CommercialStepGroup,
    done: boolean,
    score: number | null = null,
  ): CommercialStep => ({ key, group, done, score });
  return [
    step("contrat", "statut", raw.contractSignedOn !== null),
    step("rsac", "statut", Boolean(raw.rsacNumber)),
    step("urssaf", "statut", urssaf === "valide" || urssaf === "bientot"),
    step("rib", "statut", raw.ribDepositedOn !== null),
    step("ecran", "telephone", raw.homeScreenOn !== null),
    step("rappels", "telephone", raw.remindersOn),
    ...FORMATION_MODULES.map((m) =>
      step(
        `module_${m}`,
        "formation",
        formationModulePassed(raw.modules[m]),
        raw.modules[m] ?? null,
      ),
    ),
    step(
      "simulateur",
      "formation",
      (raw.bestTraining ?? 0) >= SIMULATOR_PASS_SCORE,
      raw.bestTraining,
    ),
    step("premier_prospect", "prospect", raw.firstBrief),
  ];
}

/**
 * Badge « Prêt pour le terrain » : contrat signé, RSAC renseigné, 5 quiz réussis et simulateur à
 * 14/20 au moins. Les autres étapes (Urssaf, RIB, téléphone, premier prospect) n'en dépendent pas.
 */
export function commercialReady(raw: CommercialOnboardingRaw): boolean {
  return (
    raw.contractSignedOn !== null &&
    Boolean(raw.rsacNumber) &&
    FORMATION_MODULES.every((m) => formationModulePassed(raw.modules[m])) &&
    (raw.bestTraining ?? 0) >= SIMULATOR_PASS_SCORE
  );
}

/** Étapes faites sur le total, et la première qui reste (dans l'ordre de la page). */
export function commercialOnboardingProgress(steps: readonly CommercialStep[]) {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, next: steps.find((s) => !s.done)?.key ?? null };
}

/** Numéro RSAC saisi : espaces resserrés, 3 à 40 caractères ; null s'il est invalide. */
export function normalizeRsacNumber(value: string): string | null {
  const v = value.replace(/\s+/g, " ").trim();
  return v.length >= 3 && v.length <= RSAC_NUMBER_MAX_LENGTH ? v : null;
}
