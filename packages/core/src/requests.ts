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

/** Motifs d'annulation par le client : demande en attente ou chantier avant l'acompte (F-11, F-12). */
export const CLIENT_CANCEL_REASONS = [
  "plus_besoin",
  "autre_artisan",
  "delai",
  "budget",
  "autre",
] as const;
export type ClientCancelReason = (typeof CLIENT_CANCEL_REASONS)[number];

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

/** Demandes envoyées à l'artisan et encore ouvertes (non expirées) : à accepter ou à refuser. */
export function requestsAwaitingAnswer<T extends { status: string; expires_at: string }>(
  rows: readonly T[],
  now: Date,
): T[] {
  return rows.filter((r) => r.status === "envoyee" && new Date(r.expires_at) > now);
}

/** Temps de réponse moyen (F-10) : publié à partir de 3 réponses, sur les 180 derniers jours. */
export const RESPONSE_TIME_MIN_RESPONSES = 3;
export const RESPONSE_TIME_WINDOW_DAYS = 180;

export type ResponseTimeBucket = "1h" | "3h" | "24h" | "48h";

/**
 * Tranche affichée sur la fiche (« Répond en moins de 3 h ») ; au-delà de 48 h, délai de réponse
 * aux demandes, rien n'est affiché (données anciennes ou atypiques).
 */
export function responseTimeBucket(minutes: number): ResponseTimeBucket | null {
  if (minutes < 60) return "1h";
  if (minutes < 3 * 60) return "3h";
  if (minutes < 24 * 60) return "24h";
  if (minutes < 48 * 60) return "48h";
  return null;
}

/** « Noé », « Noé et Inès », « Noé, Inès et Lou » (sans Intl.ListFormat, absent de Hermes). */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
