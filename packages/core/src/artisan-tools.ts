import { CHARTER_RULES, CHARTER_SECTIONS } from "./charter";

/**
 * Calculs d'affichage des outils de l'artisan (refonte « Nette », lot 8) : barres de progression
 * (objectifs du grade, comptes d'équipe utilisés) et avancement de la charte qualité.
 */

/** Part atteinte, entre 0 et 1, pour remplir une barre ; 0 sans cible. */
export function progressRatio(value: number, target: number): number {
  if (!(target > 0) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / target));
}

export type CharterSectionProgress = { id: string; done: number; total: number };

export type CharterProgress = {
  /** Engagements cochés parmi les règles en vigueur. */
  done: number;
  total: number;
  /** Pour cent arrondi à l'inférieur : 100 seulement quand tout est coché. */
  percent: number;
  sections: CharterSectionProgress[];
};

/**
 * Avancement de la charte (« 22 engagements sur 25 », « 3 sur 4 » par partie), d'après les codes
 * cochés (R1.1…). Les codes inconnus sont ignorés.
 */
export function charterProgress(checked: Readonly<Record<string, boolean>>): CharterProgress {
  const sections = CHARTER_SECTIONS.map((section, si) => {
    const codes = section.rules.map((_, ri) => `R${si + 1}.${ri + 1}`);
    return {
      id: section.id,
      done: codes.filter((code) => checked[code] === true).length,
      total: codes.length,
    };
  });
  const done = sections.reduce((sum, section) => sum + section.done, 0);
  const total = CHARTER_RULES.length;
  return { done, total, percent: total > 0 ? Math.floor((done * 100) / total) : 0, sections };
}
