/** Rendez-vous de l'artisan chez le client (F-17, F-18), saisis en heure de Paris. */

/** Au-delà, la date est sans doute une erreur de saisie (même règle en base). */
export const APPOINTMENT_MAX_DAYS_AHEAD = 180;
/** Durée inscrite dans le fichier agenda (F-44). */
export const APPOINTMENT_DURATION_MINUTES = 60;
export const APPOINTMENT_NOTES_MAX_LENGTH = 5000;
export const CANCEL_REASON_MAX_LENGTH = 500;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PARIS_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Décalage de Paris par rapport à UTC à un instant donné, en minutes (60 ou 120). */
function parisOffsetMinutes(at: number): number {
  const parts = PARIS_PARTS.formatToParts(new Date(at));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at / 60_000) * 60_000) / 60_000);
}

function isValidDate(date: string): boolean {
  const m = DATE.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d;
}

/** Instant correspondant à une date (AAAA-MM-JJ) et une heure (HH:MM) à Paris. */
export function parisLocalToDate(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Le décalage est relu à l'instant obtenu : il peut différer les jours de changement d'heure.
  const firstGuess = wall - parisOffsetMinutes(wall) * 60_000;
  return new Date(wall - parisOffsetMinutes(firstGuess) * 60_000);
}

export type AppointmentInputError = "invalide" | "passe" | "trop_loin";

/** Date et heure saisies à Paris : valides, à venir et au plus `maxDaysAhead` jours plus tard. */
export function futureParisInputError(
  date: string,
  time: string,
  now: Date,
  maxDaysAhead: number,
): AppointmentInputError | null {
  if (!isValidDate(date) || !TIME.test(time)) return "invalide";
  const start = parisLocalToDate(date, time).getTime();
  if (start <= now.getTime()) return "passe";
  if (start > now.getTime() + maxDaysAhead * 86_400_000) return "trop_loin";
  return null;
}

/** Contrôle de la saisie (la base refait les mêmes contrôles). */
export function appointmentInputError(
  date: string,
  time: string,
  now: Date,
): AppointmentInputError | null {
  return futureParisInputError(date, time, now, APPOINTMENT_MAX_DAYS_AHEAD);
}

export type AgendaKind = "visite" | "demarrage";

/**
 * Agenda à venir du tableau de bord (F-16) : visites planifiées et démarrages de chantier, quel
 * que soit le stade du chantier (une visite reste à faire même après l'envoi du devis), du plus
 * proche au plus lointain. Les chantiers annulés sont ignorés.
 */
export function upcomingAgenda<
  T extends { status: string; appointmentAt: string | null; startAt: string | null },
>(rows: readonly T[], now: Date, limit = 4): { kind: AgendaKind; at: string; row: T }[] {
  const entries: { kind: AgendaKind; at: string; row: T }[] = [];
  for (const row of rows) {
    if (row.status === "annule") continue;
    if (row.appointmentAt && Date.parse(row.appointmentAt) >= now.getTime()) {
      entries.push({ kind: "visite", at: row.appointmentAt, row });
    }
    if (row.startAt && Date.parse(row.startAt) >= now.getTime()) {
      entries.push({ kind: "demarrage", at: row.startAt, row });
    }
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(0, limit);
}
