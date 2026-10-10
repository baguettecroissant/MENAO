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
/** Photos ajoutées à moins de 10 minutes d'intervalle : présentées ensemble dans le journal. */
const PHOTO_GROUP_WINDOW_MS = 10 * 60_000;

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

export type JournalEntry =
  | { kind: "message"; id: string; message: string; createdAt: string }
  | { kind: "photos"; id: string; paths: string[]; createdAt: string };

/**
 * Journal du chantier, du plus récent au plus ancien. Les photos ajoutées ensemble (moins de
 * 10 minutes entre deux photos, sans message entre elles) forment une seule entrée, datée de la
 * dernière photo.
 */
export function chantierJournal(updates: readonly ChantierUpdate[]): JournalEntry[] {
  const at = (iso: string) => new Date(iso).getTime();
  const sorted = [...updates].sort((a, b) => at(a.createdAt) - at(b.createdAt));
  const entries: JournalEntry[] = [];
  for (const u of sorted) {
    if (u.kind === "message") {
      if (u.message)
        entries.push({ kind: "message", id: u.id, message: u.message, createdAt: u.createdAt });
      continue;
    }
    if (!u.storagePath) continue;
    const last = entries.at(-1);
    if (last?.kind === "photos" && at(u.createdAt) - at(last.createdAt) <= PHOTO_GROUP_WINDOW_MS) {
      last.paths.push(u.storagePath);
      last.createdAt = u.createdAt;
    } else {
      entries.push({ kind: "photos", id: u.id, paths: [u.storagePath], createdAt: u.createdAt });
    }
  }
  return entries.reverse();
}
