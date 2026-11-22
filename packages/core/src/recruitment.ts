import type { PlanCode } from "./plan-limits";

/**
 * Recrutement des conseillers MENAO (F-183, lot 77, ADR 0380) : page publique « Devenir conseiller
 * MENAO », candidature, réunion d'information en visio, suivi des candidats dans le back-office.
 * Les mêmes listes sont contrôlées en base (`apply_as_commercial`, `commercial_candidates`).
 */

/** D'où vient le candidat : coché dans le formulaire, ou rempli par le lien d'une annonce. */
export const RECRUITMENT_SOURCES = [
  "linkedin",
  "facebook",
  "indeed",
  "leboncoin",
  "bouche_a_oreille",
  "autre",
] as const;
export type RecruitmentSource = (typeof RECRUITMENT_SOURCES)[number];

const SOURCE_ALIASES: Record<string, RecruitmentSource> = {
  linkedin: "linkedin",
  facebook: "facebook",
  fb: "facebook",
  instagram: "facebook",
  meta: "facebook",
  indeed: "indeed",
  leboncoin: "leboncoin",
  lbc: "leboncoin",
  bouche_a_oreille: "bouche_a_oreille",
  "bouche-a-oreille": "bouche_a_oreille",
  cooptation: "bouche_a_oreille",
  autre: "autre",
};

/** Provenance lue dans `?source=` (lien d'une annonce) ; null si absente ou inconnue. */
export function recruitmentSourceFromParam(
  value: string | null | undefined,
): RecruitmentSource | null {
  if (!value) return null;
  return SOURCE_ALIASES[value.trim().toLowerCase()] ?? null;
}

export const RECRUITMENT_LEGAL_STATUSES = ["auto_entrepreneur", "societe", "aucun"] as const;
export type RecruitmentLegalStatus = (typeof RECRUITMENT_LEGAL_STATUSES)[number];

export const RECRUITMENT_EXPERIENCES = ["aucune", "moins_2_ans", "plus_2_ans"] as const;
export type RecruitmentExperience = (typeof RECRUITMENT_EXPERIENCES)[number];

export const RECRUITMENT_AVAILABILITIES = ["temps_plein", "temps_partiel"] as const;
export type RecruitmentAvailability = (typeof RECRUITMENT_AVAILABILITIES)[number];

/** Étapes d'un candidat, de la candidature à la décision. */
export const RECRUITMENT_STAGES = [
  "nouveau",
  "a_appeler",
  "reunion_prevue",
  "entretien",
  "retenu",
  "non_retenu",
] as const;
export type RecruitmentStage = (typeof RECRUITMENT_STAGES)[number];

/** Filtres de la liste des candidats ; « à traiter » est le filtre par défaut. */
export const RECRUITMENT_FILTERS = {
  a_traiter: ["nouveau", "a_appeler", "entretien"],
  reunion: ["reunion_prevue"],
  retenus: ["retenu"],
  non_retenus: ["non_retenu"],
  tous: RECRUITMENT_STAGES,
} as const satisfies Record<string, readonly RecruitmentStage[]>;
export type RecruitmentFilter = keyof typeof RECRUITMENT_FILTERS;

export function recruitmentFilter(value: string | null | undefined): RecruitmentFilter {
  return value && value in RECRUITMENT_FILTERS ? (value as RecruitmentFilter) : "tous";
}

/** Grille d'entretien : six critères notés de 1 à 5. */
export const INTERVIEW_CRITERIA = [
  "presentation",
  "ecoute",
  "connaissance",
  "telephone",
  "motivation",
  "disponibilite",
] as const;
export type InterviewCriterion = (typeof INTERVIEW_CRITERIA)[number];
export type InterviewGrid = Partial<Record<InterviewCriterion, number>>;

/** Garde les notes entières de 1 à 5 des critères connus ; ignore le reste. */
export function normalizeInterviewGrid(raw: unknown): InterviewGrid {
  const grid: InterviewGrid = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return grid;
  for (const key of INTERVIEW_CRITERIA) {
    const value = Number((raw as Record<string, unknown>)[key]);
    if (Number.isInteger(value) && value >= 1 && value <= 5) grid[key] = value;
  }
  return grid;
}

/** Moyenne de la grille à une décimale ; null tant qu'aucun critère n'est noté. */
export function interviewAverage(grid: InterviewGrid): number | null {
  const notes = INTERVIEW_CRITERIA.map((k) => grid[k]).filter((n): n is number => n !== undefined);
  if (!notes.length) return null;
  return Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10;
}

/** Barème des primes, en centimes : validation du dossier, puis abonnement selon la formule. */
export type RecruitmentRates = {
  validationCents: number;
  subscriptionCents: Record<PlanCode, number>;
};

/**
 * Barème annoncé sur la page quand le back-office n'a encore rien réglé (décision du 17/11/2026 :
 * 110 € à la validation, puis 30 €, 100 € ou 200 € selon la formule).
 */
export const RECRUITMENT_PUBLISHED_RATES: RecruitmentRates = {
  validationCents: 11_000,
  subscriptionCents: { base: 3_000, premium: 10_000, entreprise: 20_000 },
};

export type BonusSettingsRow = {
  prime_validation_centimes: number | null;
  prime_abonnement_centimes: number | null;
  prime_abonnement_premium_centimes: number | null;
  prime_abonnement_entreprise_centimes: number | null;
};

/**
 * Barème réglé dans le back-office (`commercial_bonus_settings`), comme le calcule la base : une
 * prime Premium ou Ultimate vide reprend celle de Base. Barème annoncé si rien n'est réglé.
 */
export function recruitmentRates(row: BonusSettingsRow | null | undefined): RecruitmentRates {
  if (row?.prime_validation_centimes == null || row.prime_abonnement_centimes == null) {
    return RECRUITMENT_PUBLISHED_RATES;
  }
  const base = row.prime_abonnement_centimes;
  return {
    validationCents: row.prime_validation_centimes,
    subscriptionCents: {
      base,
      premium: row.prime_abonnement_premium_centimes ?? base,
      entreprise: row.prime_abonnement_entreprise_centimes ?? base,
    },
  };
}

/** Prime d'abonnement la plus haute (« jusqu'à +200 € »). */
export function maxSubscriptionCents(rates: RecruitmentRates): number {
  return Math.max(...Object.values(rates.subscriptionCents));
}

export type RecruitmentSimulation = {
  validated: number;
  subscribers: Record<PlanCode, number>;
};

export const RECRUITMENT_SIMULATION_DEFAULT: RecruitmentSimulation = {
  validated: 12,
  subscribers: { base: 4, premium: 2, entreprise: 0 },
};
/** Bornes du curseur « artisans validés par mois ». */
export const RECRUITMENT_SIMULATION_MAX = 40;

const PLAN_ORDER: readonly PlanCode[] = ["base", "premium", "entreprise"];
const whole = (n: number, max: number) =>
  Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), max) : 0;

/** Remet la simulation dans ses bornes : jamais plus d'abonnés que d'artisans validés. */
export function clampSimulation(input: RecruitmentSimulation): RecruitmentSimulation {
  const validated = whole(input.validated, RECRUITMENT_SIMULATION_MAX);
  let left = validated;
  const subscribers = { base: 0, premium: 0, entreprise: 0 } as Record<PlanCode, number>;
  for (const plan of PLAN_ORDER) {
    subscribers[plan] = whole(input.subscribers[plan] ?? 0, left);
    left -= subscribers[plan];
  }
  return { validated, subscribers };
}

export type SimulationLine = {
  kind: "validation" | PlanCode;
  count: number;
  unitCents: number;
  totalCents: number;
};

/** Gains d'un mois : une ligne par prime non nulle, et le total (avant cotisations). */
export function simulateRecruitmentEarnings(
  input: RecruitmentSimulation,
  rates: RecruitmentRates,
): { lines: SimulationLine[]; totalCents: number } {
  const sim = clampSimulation(input);
  const all: SimulationLine[] = [
    {
      kind: "validation",
      count: sim.validated,
      unitCents: rates.validationCents,
      totalCents: sim.validated * rates.validationCents,
    },
    ...PLAN_ORDER.map((plan): SimulationLine => ({
      kind: plan,
      count: sim.subscribers[plan],
      unitCents: rates.subscriptionCents[plan],
      totalCents: sim.subscribers[plan] * rates.subscriptionCents[plan],
    })),
  ];
  const lines = all.filter((line) => line.kind === "validation" || line.count > 0);
  return { lines, totalCents: lines.reduce((sum, l) => sum + l.totalCents, 0) };
}

/** Réunions d'information : durée et nombre de places par défaut, rappels avant la réunion. */
export const RECRUITMENT_MEETING_DEFAULTS = { durationMinutes: 30, capacity: 10 } as const;
export const RECRUITMENT_MEETING_DURATIONS = [30, 45, 60] as const;
/** Une réunion n'est plus proposée moins de 2 heures avant son début. */
export const RECRUITMENT_BOOKING_CUTOFF_HOURS = 2;

/** Lien de visio accepté : https seulement (Google Meet, Zoom, Teams…). */
export function isMeetingUrl(value: string): boolean {
  return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(value.trim()) && value.trim().length <= 300;
}
