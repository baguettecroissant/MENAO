/**
 * Avis du client sur l'artisan (F-28) : un avis par chantier, dès le PV de réception signé
 * (« Avis vérifié »). Trois critères notés au curseur de 0 à 100 % (libellés « Inacceptable » →
 * « Irréprochable »), le rapport qualité/prix (trois choix) et un commentaire de 50 caractères au
 * moins. L'avis ne conditionne jamais un paiement (F-27) : l'invitation vient après le solde.
 * Score MENAO : mêmes règles en base (app.review_score). ADR 0030.
 */
import type { ChantierStatus } from "./chantier-state";

export const REVIEW_CRITERIA = ["quality", "delays", "communication"] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];
export const VALUE_FOR_MONEY = ["excellent", "convenable", "trop_cher"] as const;
export type ValueForMoney = (typeof VALUE_FOR_MONEY)[number];

export const REVIEW_COMMENT_LIMITS = { min: 50, max: 2000 } as const;
/** Réponse publique de l'artisan, une seule fois. */
export const REVIEW_REPLY_MAX_LENGTH = 2000;
/** Signalement d'un avis : motif décrit, transmis à l'équipe (ticket). */
export const REVIEW_REPORT_LIMITS = { min: 10, max: 1000 } as const;
/** Une seule relance du client, 3 jours après la clôture, si l'avis n'est pas laissé. */
export const REVIEW_REMINDER_DAYS = 3;

/**
 * Tranche du libellé affiché sous le curseur : [0, 20), [20, 40), [40, 60), [60, 90), [90, 100]
 * (« Inacceptable » … « Irréprochable », libellés propres à chaque critère).
 */
export type ReviewBand = 0 | 1 | 2 | 3 | 4;
export function reviewBand(value: number): ReviewBand {
  if (value >= 90) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

/** Rapport qualité/prix converti en pourcentage pour le score. */
export const VALUE_FOR_MONEY_SCORE: Readonly<Record<ValueForMoney, number>> = {
  excellent: 100,
  convenable: 60,
  trop_cher: 20,
};

/**
 * Score d'un avis (0 à 100) : moyenne pondérée des critères (poids égaux en V1), arrondie au plus
 * proche. Le score MENAO de l'artisan est la moyenne de ses avis publiés, critère par critère.
 */
export function reviewScore(r: {
  quality: number;
  delays: number;
  communication: number;
  valueForMoney: ValueForMoney;
}): number {
  const sum = r.quality + r.delays + r.communication + VALUE_FOR_MONEY_SCORE[r.valueForMoney];
  return Math.round(sum / 4);
}

/** Étoiles affichées pour un score sur 100, à l'étoile la plus proche. */
export function reviewStars(score: number): number {
  return Math.min(5, Math.max(0, Math.round(score / 20)));
}

/** Un avis par chantier, dès le PV de réception signé (avec ou sans réserves). */
export function canReview(c: { receptionSigned: boolean; hasReview: boolean }): boolean {
  return c.receptionSigned && !c.hasReview;
}

/** Invitation à noter l'artisan (carte « Noter … », relance) : chantier clôturé, sans avis. */
export function reviewInvited(status: ChantierStatus, hasReview: boolean): boolean {
  return status === "cloture" && !hasReview;
}
