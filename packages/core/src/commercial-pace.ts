import { addDays, daysBetween, mondayOf, weekdayOf } from "./agenda";

/**
 * Rythme des conseillers (F-184, lot 78, ADR 0381) : objectif commun d'artisans validés à une date
 * (500 au 31 mars), objectif de chaque conseiller par semaine, et le suivi qui en découle (ma
 * semaine, moyenne, état, classement, plan de l'équipe, rythme nécessaire, projection).
 *
 * Les conseillers sont indépendants : les objectifs portent sur des artisans validés, jamais sur des
 * horaires ni un nombre de visites ; le repère de visites par jour n'est qu'un repère affiché.
 * Semaines du lundi au dimanche, dates AAAA-MM-JJ à l'heure de Paris. L'objectif d'une semaine est
 * calculé en base (app.pace_objective, même règle que paceObjective, testée des deux côtés).
 */

export type PaceSettings = {
  /** Objectif commun d'artisans validés ; null : aucun. */
  objectif_valides: number | null;
  /** Départ du décompte et date de l'objectif (début et fin du recrutement). */
  debut: string | null;
  fin: string | null;
  /** Artisans validés par semaine et par conseiller, après le démarrage. */
  rythme_semaine: number;
  /** Pendant les premières semaines d'un conseiller. */
  rythme_demarrage: number;
  semaines_demarrage: number;
  /** Repère affiché au conseiller : visites par jour (jamais une obligation). */
  repere_visites_jour: number;
};

export const PACE_DEFAULTS = {
  rythme_semaine: 7,
  rythme_demarrage: 3,
  semaines_demarrage: 2,
  repere_visites_jour: 8,
} as const;

export const PACE_LIMITS = {
  objectif: { min: 1, max: 100_000 },
  rythme: { min: 1, max: 100 },
  demarrage: { min: 0, max: 100 },
  semainesDemarrage: { min: 0, max: 12 },
  repere: { min: 1, max: 50 },
  raison: 80,
} as const;

/** Une semaine d'un conseiller : lundi, artisans validés, objectif (null : pas encore là). */
export type PaceWeek = { semaine: string; valides: number; objectif: number | null };

/**
 * Objectif d'une semaine (son lundi) : rien avant la semaine d'arrivée ; pendant les premières
 * semaines, le rythme de démarrage (ou l'objectif propre s'il est plus bas) ; ensuite l'objectif
 * propre du conseiller (temps partiel…), sinon le rythme commun.
 */
export function paceObjective(
  settings: Pick<PaceSettings, "rythme_semaine" | "rythme_demarrage" | "semaines_demarrage">,
  conseiller: { debut: string; rythme: number | null },
  semaine: string,
): number | null {
  const start = mondayOf(conseiller.debut);
  const week = mondayOf(semaine);
  if (week < start) return null;
  const normal = conseiller.rythme ?? settings.rythme_semaine;
  if (week < addDays(start, 7 * settings.semaines_demarrage)) {
    return Math.min(settings.rythme_demarrage, normal);
  }
  return normal;
}

/** Semaine en cours : validés, objectif, ce qu'il manque d'ici dimanche, jours restants (aujourd'hui compris). */
export function paceWeek(
  weeks: readonly PaceWeek[],
  today: string,
): PaceWeek & { manque: number; joursRestants: number } {
  const semaine = mondayOf(today);
  const week = weeks.find((w) => w.semaine === semaine) ?? { semaine, valides: 0, objectif: null };
  return {
    ...week,
    manque: week.objectif === null ? 0 : Math.max(0, week.objectif - week.valides),
    joursRestants: 8 - weekdayOf(today),
  };
}

/** Semaines terminées où le conseiller avait un objectif, de la plus ancienne à la plus récente. */
function completeWeeks(weeks: readonly PaceWeek[], today: string): PaceWeek[] {
  const current = mondayOf(today);
  return [...weeks]
    .filter((w) => w.semaine < current && w.objectif !== null)
    .sort((a, b) => a.semaine.localeCompare(b.semaine));
}

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Moyenne de validés sur les 4 dernières semaines terminées où il était là ; null : aucune. */
export function paceAverage(weeks: readonly PaceWeek[], today: string, count = 4): number | null {
  const last = completeWeeks(weeks, today).slice(-count);
  if (last.length === 0) return null;
  return last.reduce((sum, w) => sum + w.valides, 0) / last.length;
}

export const PACE_STATES = ["avance", "rythme", "retard", "point", "demarrage"] as const;
export type PaceState = (typeof PACE_STATES)[number];

/** Au-delà : « En avance » ; en dessous de RETARD : « En retard » ; sous POINT deux semaines : « Point à prévoir ». */
export const PACE_THRESHOLDS = { avance: 1.1, retard: 0.8, point: 0.5 } as const;

/**
 * État d'un conseiller :
 * - « démarrage » tant qu'il n'a pas deux semaines terminées avec un objectif ;
 * - « point à prévoir » : les deux dernières semaines terminées sous la moitié de l'objectif ;
 * - sinon sa moyenne (4 semaines) face à l'objectif de la dernière semaine terminée : en avance
 *   (110 % et plus), dans le rythme (80 % et plus), en retard.
 */
export function paceState(weeks: readonly PaceWeek[], today: string): PaceState {
  const complete = completeWeeks(weeks, today);
  if (complete.length < 2) return "demarrage";
  const [before, last] = complete.slice(-2) as [PaceWeek, PaceWeek];
  const under = (w: PaceWeek) => {
    const goal = w.objectif ?? 0;
    return goal > 0 && w.valides < goal * PACE_THRESHOLDS.point;
  };
  if (under(before) && under(last)) return "point";
  const average = paceAverage(weeks, today) ?? 0;
  const objective = last.objectif ?? 0;
  if (objective <= 0) return "rythme";
  const ratio = average / objective;
  if (ratio >= PACE_THRESHOLDS.avance) return "avance";
  if (ratio >= PACE_THRESHOLDS.retard) return "rythme";
  return "retard";
}

/** Conseillers en « point à prévoir » (alerte du back-office), si l'alerte est active. */
export function paceTeamAlerts(
  conseillers: readonly (readonly PaceWeek[])[],
  today: string,
  enabled: boolean,
): number {
  if (!enabled) return 0;
  return conseillers.filter((weeks) => paceState(weeks, today) === "point").length;
}

export type PaceRankingInput = {
  /** Prénom et initiale, préparés en base. */
  nom: string;
  moi: boolean;
  /** Validés sur ses semaines terminées récentes (4 au plus) et leur nombre. */
  valides: number;
  semaines: number;
};

/** Classement de l'équipe : moyenne par semaine (une décimale), ex æquo au même rang, puis par nom. */
export function paceRanking(
  rows: readonly PaceRankingInput[],
): Array<{ rang: number; nom: string; moi: boolean; moyenne: number }> {
  const sorted = rows
    .map((r) => ({
      nom: r.nom,
      moi: r.moi,
      moyenne: oneDecimal(r.semaines > 0 ? r.valides / r.semaines : 0),
    }))
    .sort((a, b) => b.moyenne - a.moyenne || a.nom.localeCompare(b.nom, "fr"));
  return sorted.map((r, i) => ({
    ...r,
    rang: sorted.findIndex((o) => o.moyenne === r.moyenne) + 1 || i + 1,
  }));
}

type PlanSettings = Pick<
  PaceSettings,
  | "objectif_valides"
  | "debut"
  | "fin"
  | "rythme_semaine"
  | "rythme_demarrage"
  | "semaines_demarrage"
>;

/** Poids de chaque semaine du plan : les premières pèsent le rythme de démarrage. */
type Plan = { goal: number; fin: string; semaines: string[]; poids: number[]; total: number };

function planWeights(settings: PlanSettings): Plan | null {
  const { objectif_valides: goal, debut, fin } = settings;
  if (!goal || !debut || !fin || fin < debut) return null;
  const first = mondayOf(debut);
  const count = daysBetween(first, mondayOf(fin)) / 7 + 1;
  const ramp =
    settings.rythme_semaine > 0 ? settings.rythme_demarrage / settings.rythme_semaine : 1;
  const semaines = Array.from({ length: count }, (_, i) => addDays(first, 7 * i));
  const poids = semaines.map((_, i) =>
    i < settings.semaines_demarrage ? Math.max(ramp, 0.05) : 1,
  );
  return { goal, fin, semaines, poids, total: poids.reduce((sum, w) => sum + w, 0) };
}

/**
 * Plan de l'équipe : cumul prévu à la fin de chaque semaine, du lundi du début au lundi de la
 * semaine de l'objectif ; montée douce pendant le démarrage, puis régulière ; dernière semaine à
 * l'objectif. Vide sans objectif ni dates.
 */
export function pacePlan(settings: PlanSettings): Array<{ semaine: string; cumul: number }> {
  const plan = planWeights(settings);
  if (!plan) return [];
  let cumul = 0;
  return plan.semaines.map((semaine, i) => {
    cumul += plan.poids[i] ?? 0;
    return { semaine, cumul: Math.round((plan.goal * cumul) / plan.total) };
  });
}

/** Où l'équipe devrait en être aujourd'hui (au prorata des jours de la semaine) ; null sans plan. */
export function pacePlanToday(settings: PlanSettings, today: string): number | null {
  const plan = planWeights(settings);
  if (!plan) return null;
  const { goal, fin, semaines, poids, total } = plan;
  const first = semaines[0] ?? fin;
  if (today < first) return 0;
  if (today >= fin) return goal;
  const index = Math.floor(daysBetween(first, today) / 7);
  if (index >= semaines.length) return goal;
  const done = poids.slice(0, index).reduce((sum, w) => sum + w, 0);
  const part = ((poids[index] ?? 0) * weekdayOf(today)) / 7;
  return Math.round((goal * (done + part)) / total);
}

/** Semaines qui restent jusqu'à la date de l'objectif, aujourd'hui compris ; 0 une fois passée. */
function weeksLeft(fin: string, today: string): number {
  return Math.max(0, (daysBetween(today, fin) + 1) / 7);
}

/** Validés qu'il faut par semaine d'ici la date de l'objectif ; null sans objectif ou une fois passée. */
export function paceNeededPerWeek(
  settings: Pick<PaceSettings, "objectif_valides" | "fin">,
  valides: number,
  today: string,
): number | null {
  if (!settings.objectif_valides || !settings.fin) return null;
  const left = weeksLeft(settings.fin, today);
  if (left === 0) return null;
  return Math.max(0, Math.ceil((settings.objectif_valides - valides) / left));
}

/** Validés à la date de l'objectif si le rythme récent (par semaine) continue ; null sans rythme ni date. */
export function paceProjection(
  settings: Pick<PaceSettings, "fin">,
  valides: number,
  perWeek: number | null,
  today: string,
): number | null {
  if (perWeek === null || !settings.fin) return null;
  return Math.round(valides + perWeek * weeksLeft(settings.fin, today));
}

/** Rythme récent de l'équipe : moyenne des `count` dernières semaines terminées ; null : aucune. */
export function paceRecentRate(
  weeks: readonly { semaine: string; valides: number }[],
  today: string,
  count = 3,
): number | null {
  const current = mondayOf(today);
  const done = weeks
    .filter((w) => w.semaine < current)
    .sort((a, b) => a.semaine.localeCompare(b.semaine));
  const last = done.slice(-count);
  if (last.length === 0) return null;
  return oneDecimal(last.reduce((s, w) => s + w.valides, 0) / last.length);
}
