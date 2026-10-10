/**
 * Suivi du chantier par l'artisan (F-22) : date de démarrage confirmée après l'acompte, journal
 * (messages et photos), fin des travaux déclarée. Mêmes règles en base (migration suivi_chantier).
 */
import { futureParisInputError, type AppointmentInputError } from "./appointment";
import type { ChantierStatus } from "./chantier-state";

/** Au-delà, la date est sans doute une erreur de saisie (même règle en base). */
export const CHANTIER_START_MAX_DAYS_AHEAD = 365;
/** Heure de démarrage proposée par défaut, à Paris. */
export const DEFAULT_CHANTIER_START_TIME = "08:00";
export const CHANTIER_MESSAGE_MAX_LENGTH = 2000;
/** Photos du journal par chantier (même limite en base). */
export const MAX_CHANTIER_PHOTOS = 100;
/** Photos envoyées en une fois par « Ajouter des photos ». */
export const MAX_CHANTIER_PHOTOS_PER_BATCH = 10;

/** Date confirmée après l'acompte, modifiable tant que les travaux n'ont pas commencé. */
export const START_DATE_STATUSES = [
  "acompte_paye",
  "planifie",
] as const satisfies readonly ChantierStatus[];

/**
 * Journal ouvert pendant les travaux et jusqu'à la réception (F-22 : « pendant les travaux » ;
 * maquette : « une fois celui-ci en cours »).
 */
export const CHANTIER_JOURNAL_STATUSES = [
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
] as const satisfies readonly ChantierStatus[];

export function canEditStartDate(status: ChantierStatus): boolean {
  return (START_DATE_STATUSES as readonly ChantierStatus[]).includes(status);
}

export function isJournalOpen(status: ChantierStatus): boolean {
  return (CHANTIER_JOURNAL_STATUSES as readonly ChantierStatus[]).includes(status);
}

/** « Déclarer le chantier terminé » : une fois les travaux commencés. */
export function canDeclareFinished(status: ChantierStatus): boolean {
  return status === "en_cours";
}

/** Contrôle de la date et de l'heure de démarrage saisies à Paris (la base refait les mêmes). */
export function chantierStartInputError(
  date: string,
  time: string,
  now: Date,
): AppointmentInputError | null {
  return futureParisInputError(date, time, now, CHANTIER_START_MAX_DAYS_AHEAD);
}

export type ChantierUpdate = {
  id: string;
  kind: "message" | "photo";
  message: string | null;
  storagePath: string | null;
  createdAt: string;
};

export type JournalSummary = {
  /** Chemins des photos, de la plus récente à la plus ancienne. */
  photos: string[];
  /** Messages, du plus récent au plus ancien. */
  messages: { id: string; message: string; createdAt: string }[];
  lastUpdateAt: string | null;
};

/**
 * Journal présenté comme sur les maquettes (F-22, F-12) : mosaïque des photos et messages, du plus
 * récent au plus ancien, avec la date de la dernière mise à jour.
 */
export function journalSummary(updates: readonly ChantierUpdate[]): JournalSummary {
  const at = (iso: string) => new Date(iso).getTime();
  const sorted = [...updates].sort((a, b) => at(b.createdAt) - at(a.createdAt));
  return {
    photos: sorted.flatMap((u) => (u.kind === "photo" && u.storagePath ? [u.storagePath] : [])),
    messages: sorted.flatMap((u) =>
      u.kind === "message" && u.message
        ? [{ id: u.id, message: u.message, createdAt: u.createdAt }]
        : [],
    ),
    lastUpdateAt: sorted[0]?.createdAt ?? null,
  };
}
