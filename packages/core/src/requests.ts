/** Demandes de chantier (F-11, F-17). */

/** Décision des fondateurs (2026-10-09) : « 3 devis en 72 h », demande envoyée à 3 artisans au plus. */
export const MAX_ARTISANS_PER_REQUEST = 3;
/** Délai de réponse de l'artisan (F-11). */
export const REQUEST_RESPONSE_HOURS = 48;

export const REQUEST_STATUSES = ["envoyee", "acceptee", "refusee", "expiree", "annulee"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Motifs de refus (F-17). */
export const REFUSAL_REASONS = [
  "planning_complet",
  "hors_expertise",
  "hors_zone",
  "autre",
] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export const CALLBACK_MODES = ["des_que_possible", "plage"] as const;
export const REQUEST_MESSAGE_MAX_LENGTH = 10_000;

const ACTIVE: readonly RequestStatus[] = ["envoyee", "acceptee"];

/** Nombre d'artisans encore sollicitables pour un projet (refus et expirations libèrent une place). */
export function remainingSlots(statuses: readonly RequestStatus[]): number {
  return Math.max(0, MAX_ARTISANS_PER_REQUEST - statuses.filter((s) => ACTIVE.includes(s)).length);
}

export function requestDeadline(sentAt: Date): Date {
  return new Date(sentAt.getTime() + REQUEST_RESPONSE_HOURS * 3_600_000);
}

/** Temps restant avant l'échéance, ou null si elle est dépassée. */
export function timeLeft(deadline: Date, now: Date): { hours: number; minutes: number } | null {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
