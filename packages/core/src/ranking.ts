import { CHARTER_SCORE_WEIGHTS, type CharterScoreKey } from "./charter";

/**
 * Score MENAO de classement des artisans (ADR 0105), d'après la charte qualité : six critères
 * notés de 0 à 100, pondérés par CHARTER_SCORE_WEIGHTS. Mêmes formules en base
 * (app.artisan_charter_score, migration score_charte).
 *
 * Un artisan sans historique n'est pas écrasé : chaque taux part d'une valeur neutre (70 %),
 * comptée comme 3 événements, que les vrais chiffres remplacent peu à peu.
 */
export const RANKING_PRIOR = { rate: 0.7, average: 70, strength: 3 } as const;

/** Fenêtres de calcul, en jours. */
export const RANKING_WINDOWS = { delai72h: 365, reactivite: 180, chantiers: 365 } as const;

/** Taux de réussite lissé, de 0 à 100. */
export function smoothedRate(successes: number, total: number): number {
  const { rate, strength } = RANKING_PRIOR;
  return ((successes + rate * strength) / (total + strength)) * 100;
}

/** Moyenne lissée (avis de 0 à 100) ; sans avis, la valeur neutre. */
export function smoothedAverage(average: number | null, count: number): number {
  const { average: prior, strength } = RANKING_PRIOR;
  if (average === null || count <= 0) return prior;
  return (average * count + prior * strength) / (count + strength);
}

/** Planning : plein jusqu'à 7 jours sans mise à jour, puis décroissance jusqu'à 0 à 28 jours. */
export function planningFreshness(daysSinceUpdate: number | null): number {
  if (daysSinceUpdate === null) return 0;
  if (daysSinceUpdate <= 7) return 100;
  return Math.max(0, Math.min(1, (28 - daysSinceUpdate) / 21)) * 100;
}

/** Ancienneté (24 mois pour le maximum) et badges obtenus, à parts égales. */
export function seniorityAndBadges(
  monthsSinceValidation: number,
  badges: number,
  badgesTotal: number,
): number {
  const seniority = Math.max(0, Math.min(1, monthsSinceValidation / 24));
  const badgeShare = badgesTotal > 0 ? Math.min(1, badges / badgesTotal) : 0;
  return (seniority * 0.5 + badgeShare * 0.5) * 100;
}

export type CharterScoreComponents = Record<CharterScoreKey, number>;

/** Score global de 0 à 100, arrondi. */
export function charterScore(components: CharterScoreComponents): number {
  const total = CHARTER_SCORE_WEIGHTS.reduce((sum, w) => sum + w.weight * components[w.key], 0);
  return Math.round(total / 100);
}
