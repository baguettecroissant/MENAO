/**
 * Tableaux de lancement (F-66, ADR 0208) : équipe de lancement, planning daté de chaque membre,
 * jalons et rendez-vous réguliers. État d'une tâche (faite, en retard, cette semaine, à venir,
 * régulière), progression, semaines du planning, frise, compte à rebours des jalons et phases.
 * Dates AAAA-MM-JJ, « aujourd'hui » à l'heure de Paris. Mêmes listes et bornes qu'en base.
 */
import { addDays, mondayOf } from "./agenda";
import { daysUntil } from "./expiry";
import { parisToday } from "./project";

/** Jours calendaires jusqu'à une date (négatif si passée), partagé avec le suivi des échéances. */
export { daysUntil };

/** Phases du lancement (enum `public.launch_phase`), dans l'ordre. */
export const LAUNCH_PHASES = [
  "preparation",
  "pre_ouverture",
  "lancement",
  "essais",
  "apres",
] as const;
export type LaunchPhase = (typeof LAUNCH_PHASES)[number];

/** États d'une tâche (enum `public.launch_task_status`). */
export const LAUNCH_TASK_STATUSES = ["a_faire", "en_cours", "fait"] as const;
export type LaunchTaskStatus = (typeof LAUNCH_TASK_STATUSES)[number];

/** Catégories d'une tâche (contrôle `launch_tasks.categorie` en base). */
export const LAUNCH_CATEGORIES = [
  "digital",
  "terrain",
  "reseaux",
  "contenus",
  "presse",
  "ambassadeurs",
  "produit",
  "juridique",
  "pilotage",
  "equipe",
  "validation",
  "evenement",
] as const;
export type LaunchCategory = (typeof LAUNCH_CATEGORIES)[number];

/** Rôles dans l'équipe de lancement (enum `public.launch_member_kind`). */
export const LAUNCH_MEMBER_KINDS = ["associe", "commercial", "validation", "autre"] as const;
export type LaunchMemberKind = (typeof LAUNCH_MEMBER_KINDS)[number];

/** Bornes des champs (contrôles de `launch_members`, `launch_tasks` et de l'import). */
export const LAUNCH_LIMITS = {
  memberNameMaxLength: 80,
  missionMaxLength: 300,
  /** Objectif individuel de dossiers validés (réservé aux admins). */
  objectiveMax: 10_000,
  titleMaxLength: 140,
  detailMaxLength: 1000,
  recurrenceMaxLength: 80,
  /** Plafonds d'un fichier d'import. */
  maxMembers: 50,
  maxTasks: 2000,
  /** Dates acceptées (début, échéance) : une année mal tapée (0027, 2207) est refusée. */
  minDate: "2020-01-01",
  maxDate: "2040-12-31",
} as const;

/** Référence stable d'un membre dans le fichier d'import (« equipe-terrain »). */
export const LAUNCH_MEMBER_REF_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Référence stable d'une tâche dans le fichier d'import (« T1.terrain_02 »). */
export const LAUNCH_TASK_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/;

/** Ce qu'il faut d'une tâche pour la classer (ligne de `launch_tasks` ou de `my_launch_plan`). */
export interface LaunchTaskLike {
  id: string;
  titre: string;
  phase: LaunchPhase;
  debut: string | null;
  echeance: string | null;
  /** Rendez-vous régulier (« Chaque lundi à 9 h ») : hors progression. */
  recurrence: string | null;
  /** Date clé, avec compte à rebours. */
  jalon: boolean;
  statut: LaunchTaskStatus;
}

export type LaunchTaskState = "fait" | "en_retard" | "cette_semaine" | "a_venir" | "regulier";

const isRegular = (task: LaunchTaskLike) => Boolean(task.recurrence);
const byDateThenTitle = (a: LaunchTaskLike, b: LaunchTaskLike) =>
  (a.echeance ?? "").localeCompare(b.echeance ?? "") || a.titre.localeCompare(b.titre, "fr");

/**
 * État d'une tâche : rendez-vous régulier d'abord, puis faite, en retard (échéance passée), cette
 * semaine (échéance d'ici dimanche, semaine du lundi au dimanche) ou à venir.
 */
export function launchTaskState(
  task: LaunchTaskLike,
  today: string = parisToday(),
): LaunchTaskState {
  if (isRegular(task)) return "regulier";
  if (task.statut === "fait") return "fait";
  if (task.echeance === null) return "a_venir";
  if (task.echeance < today) return "en_retard";
  if (task.echeance <= addDays(mondayOf(today), 6)) return "cette_semaine";
  return "a_venir";
}

/** Tâches faites sur le total, hors rendez-vous réguliers ; pourcentage entier (0 sans tâche). */
export function launchProgress(tasks: readonly LaunchTaskLike[]): {
  done: number;
  total: number;
  percent: number;
} {
  const counted = tasks.filter((t) => !isRegular(t));
  const done = counted.filter((t) => t.statut === "fait").length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done * 100) / total) };
}

/** Nombre de tâches dans chaque état (tous les états présents). */
export function launchCounts(
  tasks: readonly LaunchTaskLike[],
  today: string = parisToday(),
): Record<LaunchTaskState, number> {
  const counts: Record<LaunchTaskState, number> = {
    fait: 0,
    en_retard: 0,
    cette_semaine: 0,
    a_venir: 0,
    regulier: 0,
  };
  for (const task of tasks) counts[launchTaskState(task, today)] += 1;
  return counts;
}

/**
 * Tâches qui comptent sur le tableau d'un membre (filtres, compteurs, frise des semaines) : les
 * siennes, et les tâches partagées encore à venir ou régulières. Une tâche partagée qui n'est pas
 * la sienne n'est jamais « en retard » ni « faite » pour lui (il ne peut pas la cocher) : passée
 * ou faite, elle ne reste que dans la vue complète.
 */
export function launchBoardTasks<T extends LaunchTaskLike & { own: boolean }>(
  tasks: readonly T[],
  today: string = parisToday(),
): T[] {
  return tasks.filter((task) => {
    if (task.own) return true;
    const state = launchTaskState(task, today);
    return state === "cette_semaine" || state === "a_venir" || state === "regulier";
  });
}

/** Tâches datées (hors rendez-vous réguliers) rangées par lundi de leur échéance. */
function byWeek<T extends LaunchTaskLike>(tasks: readonly T[]): Map<string, T[]> {
  const weeks = new Map<string, T[]>();
  for (const task of tasks) {
    if (isRegular(task) || task.echeance === null) continue;
    const start = mondayOf(task.echeance);
    weeks.set(start, [...(weeks.get(start) ?? []), task]);
  }
  return weeks;
}

const weekTotals = (tasks: readonly LaunchTaskLike[], today: string) => ({
  done: tasks.filter((t) => t.statut === "fait").length,
  total: tasks.length,
  late: tasks.filter((t) => launchTaskState(t, today) === "en_retard").length,
});

/**
 * Planning semaine par semaine (lundi → dimanche) : seulement les semaines qui ont des tâches,
 * dans l'ordre ; tâches par échéance puis titre. Rendez-vous réguliers à part.
 */
export function launchWeeks<T extends LaunchTaskLike>(
  tasks: readonly T[],
  today: string = parisToday(),
): Array<{
  start: string;
  end: string;
  state: "passee" | "courante" | "a_venir";
  tasks: T[];
  done: number;
  total: number;
  late: number;
}> {
  return [...byWeek(tasks)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, list]) => {
      const end = addDays(start, 6);
      const sorted = [...list].sort(byDateThenTitle);
      return {
        start,
        end,
        state: end < today ? "passee" : start <= today ? "courante" : "a_venir",
        tasks: sorted,
        ...weekTotals(sorted, today),
      };
    });
}

/**
 * Taille de la frise : 26 semaines au plus (six mois), en commençant 4 semaines avant celle du
 * jour, pour que celle-ci soit à l'écran sans défiler, même sur un téléphone.
 */
export const LAUNCH_STRIP_WEEKS = { max: 26, before: 4 } as const;

/**
 * Frise des semaines, sans trou : de la semaine de la première échéance à celle de la dernière,
 * semaines vides comprises ; la semaine du jour est repérée si elle est dans l'intervalle. Au plus
 * LAUNCH_STRIP_WEEKS.max semaines, à partir de LAUNCH_STRIP_WEEKS.before semaines avant celle du
 * jour (jamais avant la première ; avant le planning : depuis son début ; après : ses dernières
 * semaines). Les semaines plus anciennes restent dans la liste des tâches.
 */
export function launchWeekStrip(
  tasks: readonly LaunchTaskLike[],
  today: string = parisToday(),
): Array<{ start: string; total: number; done: number; late: number; current: boolean }> {
  const weeks = byWeek(tasks);
  const starts = [...weeks.keys()].sort();
  const first = starts[0];
  const last = starts[starts.length - 1];
  if (first === undefined || last === undefined) return [];
  const currentWeek = mondayOf(today);
  const { max, before } = LAUNCH_STRIP_WEEKS;
  const anchor = currentWeek < first ? first : currentWeek > last ? last : currentWeek;
  const earliest = addDays(anchor, -7 * before);
  const from = earliest < first ? first : earliest;
  const window = addDays(from, 7 * (max - 1));
  const to = window < last ? window : last;
  const out: Array<{ start: string; total: number; done: number; late: number; current: boolean }> =
    [];
  for (let start = from; start <= to; start = addDays(start, 7)) {
    const { done, total, late } = weekTotals(weeks.get(start) ?? [], today);
    out.push({ start, total, done, late, current: start === currentWeek });
  }
  return out;
}

/** Prochains jalons pas encore faits (échéance aujourd'hui ou plus tard), avec les jours restants. */
export function upcomingMilestones(
  tasks: readonly LaunchTaskLike[],
  today: string = parisToday(),
  limit = 3,
): Array<{ id: string; titre: string; echeance: string; daysLeft: number }> {
  return tasks
    .filter(
      (t): t is LaunchTaskLike & { echeance: string } =>
        t.jalon && t.statut !== "fait" && t.echeance !== null && t.echeance >= today,
    )
    .sort(byDateThenTitle)
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      titre: t.titre,
      echeance: t.echeance,
      daysLeft: daysUntil(t.echeance, today),
    }));
}

/**
 * Les 5 phases dans l'ordre : début (plus tôt des débuts, ou de l'échéance à défaut), fin (dernière
 * échéance), avancement (hors rendez-vous réguliers) et phase en cours (aujourd'hui entre les deux,
 * bornes incluses). Une seule phase en cours : quand des phases se chevauchent, la dernière qui a
 * commencé. Phase sans tâche datée : bornes nulles.
 */
export function launchPhaseSummary(
  tasks: readonly LaunchTaskLike[],
  today: string = parisToday(),
): Array<{
  phase: LaunchPhase;
  start: string | null;
  end: string | null;
  done: number;
  total: number;
  percent: number;
  current: boolean;
}> {
  const phases = LAUNCH_PHASES.map((phase) => {
    const list = tasks.filter((t) => t.phase === phase);
    const starts = list.flatMap((t) => t.debut ?? t.echeance ?? []).sort();
    const ends = list.flatMap((t) => t.echeance ?? []).sort();
    const start = starts[0] ?? null;
    const end = ends[ends.length - 1] ?? null;
    return {
      phase,
      start,
      end,
      ...launchProgress(list),
      current: start !== null && end !== null && start <= today && today <= end,
    };
  });
  const currentIndex = phases.reduce((found, p, i) => (p.current ? i : found), -1);
  return phases.map((p, i) => ({ ...p, current: i === currentIndex }));
}

/**
 * Initiales d'un membre pour sa pastille : première lettre du premier et du dernier mot (tirets
 * compris), en majuscules, deux au plus (« Rémi Commercial » → « RC », « Léa » → « L »).
 */
export function initials(nom: string): string {
  const letters = nom
    .normalize("NFC")
    .split(/[\s-]+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter((letter): letter is string => letter !== undefined);
  const picked = letters.length > 1 ? [letters[0], letters[letters.length - 1]] : letters;
  return picked.map((letter) => Array.from((letter ?? "").toLocaleUpperCase("fr"))[0]).join("");
}
