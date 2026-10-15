/**
 * Notation du client par l'artisan (F-23, charte qualité R5.2, ADR 0106) : une note par chantier,
 * une fois le chantier clôturé. Trois critères au curseur de 0 à 100 % (accueil et accès, clarté
 * du besoin, délai des paiements) et un commentaire de 50 caractères au moins.
 * Jamais montrée au client ni publiée. La moyenne n'est visible des artisans qui reçoivent une
 * demande du client que si l'équipe l'active (platform_settings « client_ratings_visible »).
 * TODO(legal): base légale et information des clients avant d'activer la visibilité (D11).
 */
import type { ChantierStatus } from "./chantier-state";

export const CLIENT_RATING_CRITERIA = ["welcome", "clarity", "payment"] as const;
export type ClientRatingCriterion = (typeof CLIENT_RATING_CRITERIA)[number];

export const CLIENT_RATING_COMMENT_LIMITS = { min: 50, max: 1000 } as const;

export function canRateClient(status: ChantierStatus): boolean {
  return status === "cloture";
}

export type ClientRatingValues = Record<ClientRatingCriterion, number>;

/** Moyenne de chaque critère (arrondie) et nombre de notes ; null sans note. */
export function clientReputation(
  ratings: readonly ClientRatingValues[],
): ({ ratings: number } & ClientRatingValues) | null {
  if (ratings.length === 0) return null;
  const avg = (key: ClientRatingCriterion) =>
    Math.round(ratings.reduce((sum, r) => sum + r[key], 0) / ratings.length);
  return {
    ratings: ratings.length,
    welcome: avg("welcome"),
    clarity: avg("clarity"),
    payment: avg("payment"),
  };
}
