import {
  LAUNCH_CATEGORIES,
  type LaunchCategory,
  type LaunchTaskLike,
  type LaunchTaskState,
} from "@menao/core";

/**
 * Tableau de lancement (F-66, ADR 0208) : une tâche telle que l'affiche le tableau d'un membre,
 * dans le back-office comme dans l'espace commercial. Les états, semaines et compteurs viennent de
 * @menao/core (launchTaskState, launchWeeks…).
 */
export type LaunchBoardTask = LaunchTaskLike & {
  detail: string | null;
  categorie: LaunchCategory;
  partage: boolean;
  /** Tâche du membre affiché ; sinon tâche partagée avec toute l'équipe. */
  own: boolean;
};

/** Filtres du tableau, dans l'ordre des onglets ; « À faire » par défaut (sans paramètre). */
export const LAUNCH_VIEWS = ["a_faire", "retard", "semaine", "faites", "tout"] as const;
export type LaunchView = (typeof LAUNCH_VIEWS)[number];

/** États montrés par chaque filtre (rendez-vous réguliers à part). */
export const LAUNCH_VIEW_STATES: Record<LaunchView, readonly LaunchTaskState[]> = {
  a_faire: ["en_retard", "cette_semaine", "a_venir"],
  retard: ["en_retard"],
  semaine: ["cette_semaine"],
  faites: ["fait"],
  tout: ["fait", "en_retard", "cette_semaine", "a_venir"],
};

/** Paramètre `vue` de l'adresse → filtre ; inconnu ou absent : « À faire ». */
export function parseLaunchView(value: string | string[] | undefined): LaunchView {
  return LAUNCH_VIEWS.find((view) => view === value) ?? "a_faire";
}

/** Catégorie lue en base (texte contrôlé par la base) ; inconnue : « Pilotage ». */
export const toLaunchCategory = (value: string): LaunchCategory =>
  LAUNCH_CATEGORIES.find((category) => category === value) ?? "pilotage";

/** Ligne de `launch_tasks` (lecture admin) → tâche du tableau de `memberId` (null : équipe). */
export function toLaunchBoardTask(
  row: Omit<LaunchBoardTask, "categorie" | "own"> & {
    categorie: string;
    member_id: string | null;
  },
  memberId: string | null,
): LaunchBoardTask {
  return {
    id: row.id,
    titre: row.titre,
    detail: row.detail,
    phase: row.phase,
    categorie: toLaunchCategory(row.categorie),
    debut: row.debut,
    echeance: row.echeance,
    recurrence: row.recurrence,
    jalon: row.jalon,
    partage: row.partage,
    statut: row.statut,
    own: memberId !== null && row.member_id === memberId,
  };
}
