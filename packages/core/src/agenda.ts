/**
 * Agenda et disponibilités de l'artisan (F-44, F-18) : horaires de travail, absences (congés,
 * fermetures), créneaux bloqués, statut de disponibilité, créneaux de rendez-vous suggérés et
 * avertissements à la saisie. Dates AAAA-MM-JJ et heures HH:MM à Paris ; jours de la semaine de
 * 1 (lundi) à 7 (dimanche), comme en base (isodow). Mêmes contrôles en base.
 */
import { APPOINTMENT_DURATION_MINUTES, isValidDate, parisLocalToDate } from "./appointment";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Plage de travail d'un jour de la semaine. */
export type HoursRange = { weekday: Weekday; start: string; end: string };
/** Absence sur des journées entières, bornes incluses. */
export type Absence = { startsOn: string; endsOn: string; label?: string | null };
/** Rendez-vous, démarrage ou créneau bloqué déjà inscrit à l'agenda. */
export type BusySlot = { start: string | Date; durationMinutes: number };

export const MAX_RANGES_PER_DAY = 3;
export const AGENDA_LABEL_MAX_LENGTH = 80;
/** Une absence dure au plus un an et commence au plus un an à l'avance. */
export const ABSENCE_MAX_DAYS = 365;
export const AGENDA_MAX_DAYS_AHEAD = 365;

/** Horaires proposés au départ : du lundi au vendredi, 8 h – 12 h et 13 h 30 – 17 h 30. */
export const SUGGESTED_HOURS: readonly HoursRange[] = ([1, 2, 3, 4, 5] as const).flatMap(
  (weekday) => [
    { weekday, start: "08:00", end: "12:00" },
    { weekday, start: "13:30", end: "17:30" },
  ],
);

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;
const NOON = 12 * 60;
const PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const timeToMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const pad = (n: number) => String(n).padStart(2, "0");
export const minutesToTime = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const dayNumber = (date: string) =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
const fromDayNumber = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) =>
  fromDayNumber(dayNumber(date) + days * DAY_MS);
/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export const daysBetween = (from: string, to: string) =>
  Math.round((dayNumber(to) - dayNumber(from)) / DAY_MS);

function addMonths(date: string, months: number): string {
  const [y, m, d] = [
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1 + months,
    Number(date.slice(8, 10)),
  ];
  // Le 31 janvier plus un mois donne le dernier jour de février.
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return fromDayNumber(Date.UTC(y, m, Math.min(d, lastDay)));
}

export const weekdayOf = (date: string): Weekday =>
  (((new Date(dayNumber(date)).getUTCDay() + 6) % 7) + 1) as Weekday;
export const mondayOf = (date: string) => addDays(date, 1 - weekdayOf(date));
/** Les sept dates (lundi → dimanche) de la semaine qui contient `date`. */
export const weekDates = (date: string) => {
  const monday = mondayOf(date);
  return WEEKDAYS.map((d) => addDays(monday, d - 1));
};

/** Semaine affichée par l'agenda (?semaine=AAAA-MM-JJ) : celle du jour si absente ou incohérente. */
export function weekStartFrom(param: string | null | undefined, today: string): string {
  if (param && isValidDate(param) && Math.abs(daysBetween(today, param)) <= 2 * 366) {
    return mondayOf(param);
  }
  return mondayOf(today);
}

/** Date et heure (en minutes depuis minuit) d'un instant, à Paris. */
export function parisDateTime(at: Date): { date: string; minutes: number } {
  const parts = PARIS.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// ---------------------------------------------------------------------------
// Horaires de travail
// ---------------------------------------------------------------------------

export type HoursError = "format" | "ordre" | "chevauchement" | "trop_de_plages";

/** Plages du jour, dans l'ordre. */
export function rangesOn(hours: readonly HoursRange[], weekday: Weekday): HoursRange[] {
  return hours.filter((h) => h.weekday === weekday).sort((a, b) => a.start.localeCompare(b.start));
}

/** Plages valides : heures HH:MM, début avant la fin, trois plages par jour au plus, disjointes. */
export function hoursErrors(hours: readonly HoursRange[]): HoursError | null {
  if (
    hours.some(
      (h) =>
        !Number.isInteger(h.weekday) ||
        h.weekday < 1 ||
        h.weekday > 7 ||
        !TIME.test(h.start) ||
        !TIME.test(h.end),
    )
  ) {
    return "format";
  }
  if (hours.some((h) => h.start >= h.end)) return "ordre";
  for (const weekday of WEEKDAYS) {
    const ranges = rangesOn(hours, weekday);
    if (ranges.length > MAX_RANGES_PER_DAY) return "trop_de_plages";
    if (ranges.some((r, i) => i > 0 && r.start < (ranges[i - 1]?.end ?? ""))) {
      return "chevauchement";
    }
  }
  return null;
}

/** Le créneau (minutes depuis minuit) tient-il dans une plage de travail de ce jour ? */
export function withinHours(
  hours: readonly HoursRange[],
  date: string,
  startMinutes: number,
  endMinutes: number,
): boolean {
  return rangesOn(hours, weekdayOf(date)).some(
    (h) => timeToMinutes(h.start) <= startMinutes && endMinutes <= timeToMinutes(h.end),
  );
}

// ---------------------------------------------------------------------------
// Absences et statut
// ---------------------------------------------------------------------------

export type AbsenceError = "invalide" | "ordre" | "passee" | "trop_longue" | "trop_loin";

export function absenceError(startsOn: string, endsOn: string, today: string): AbsenceError | null {
  if (!isValidDate(startsOn) || !isValidDate(endsOn)) return "invalide";
  if (endsOn < startsOn) return "ordre";
  if (endsOn < today) return "passee";
  if (daysBetween(startsOn, endsOn) + 1 > ABSENCE_MAX_DAYS) return "trop_longue";
  if (daysBetween(today, startsOn) > AGENDA_MAX_DAYS_AHEAD) return "trop_loin";
  return null;
}

/** Absence qui couvre la date (bornes incluses). */
export function absenceOn<A extends Absence>(absences: readonly A[], date: string): A | null {
  return absences.find((a) => a.startsOn <= date && date <= a.endsOn) ?? null;
}

export type AvailabilityStatus =
  | { kind: "pause" }
  | { kind: "conges"; until: string; label: string | null }
  | { kind: "a_partir_du"; date: string }
  | { kind: "disponible" };

/**
 * Statut affiché à l'artisan : en pause, en congés (absences qui se suivent réunies), nouveaux
 * chantiers à partir d'une date, ou disponible. Pause et congés le retirent des recherches.
 */
export function availabilityStatus({
  paused,
  availableFrom,
  absences,
  today,
}: {
  paused: boolean;
  availableFrom: string | null;
  absences: readonly Absence[];
  today: string;
}): AvailabilityStatus {
  if (paused) return { kind: "pause" };
  const current = absenceOn(absences, today);
  if (current) {
    let until = current.endsOn;
    for (;;) {
      const next = absences.find((a) => a.startsOn <= addDays(until, 1) && a.endsOn > until);
      if (!next) break;
      until = next.endsOn;
    }
    return { kind: "conges", until, label: current.label ?? null };
  }
  if (availableFrom && availableFrom > today) return { kind: "a_partir_du", date: availableFrom };
  return { kind: "disponible" };
}

export type AvailableFromChoice = "maintenant" | "semaine" | "deux_semaines" | "mois";

/** Raccourcis de « Nouveaux chantiers à partir du » : maintenant, dans 1 ou 2 semaines, dans 1 mois. */
export function availableFromChoices(
  today: string,
): { key: AvailableFromChoice; date: string | null }[] {
  return [
    { key: "maintenant", date: null },
    { key: "semaine", date: addDays(today, 7) },
    { key: "deux_semaines", date: addDays(today, 14) },
    { key: "mois", date: addMonths(today, 1) },
  ];
}

// ---------------------------------------------------------------------------
// Créneaux bloqués, rendez-vous suggérés et avertissements
// ---------------------------------------------------------------------------

export type BlockedSlotError = "invalide" | "ordre" | "passe" | "trop_loin";

/** Créneau bloqué sur une journée : heures valides, début avant la fin, pas encore terminé. */
export function blockedSlotError(
  date: string,
  start: string,
  end: string,
  now: Date,
): BlockedSlotError | null {
  if (!isValidDate(date) || !TIME.test(start) || !TIME.test(end)) return "invalide";
  if (end <= start) return "ordre";
  if (parisLocalToDate(date, end).getTime() <= now.getTime()) return "passe";
  if (parisLocalToDate(date, start).getTime() > now.getTime() + AGENDA_MAX_DAYS_AHEAD * DAY_MS) {
    return "trop_loin";
  }
  return null;
}

/** Éléments de l'agenda qui chevauchent le créneau (pour les nommer dans l'avertissement). */
export function slotConflicts<T extends BusySlot>(
  start: Date,
  durationMinutes: number,
  busy: readonly T[],
): T[] {
  const from = start.getTime();
  const to = from + durationMinutes * 60_000;
  return busy.filter((b) => {
    const bStart = new Date(b.start).getTime();
    return bStart < to && from < bStart + b.durationMinutes * 60_000;
  });
}

export type SlotWarning = "hors_horaires" | "absence" | "conflit";

/**
 * Avertissements (non bloquants) pour un rendez-vous : pendant une absence, hors des horaires
 * de travail (s'ils sont renseignés), ou en même temps qu'un autre élément de l'agenda.
 */
export function slotWarnings({
  start,
  durationMinutes,
  hours,
  absences,
  busy,
}: {
  start: Date;
  durationMinutes: number;
  hours: readonly HoursRange[];
  absences: readonly Absence[];
  busy: readonly BusySlot[];
}): SlotWarning[] {
  const { date, minutes } = parisDateTime(start);
  const warnings: SlotWarning[] = [];
  if (absenceOn(absences, date)) warnings.push("absence");
  else if (hours.length > 0 && !withinHours(hours, date, minutes, minutes + durationMinutes)) {
    warnings.push("hors_horaires");
  }
  if (slotConflicts(start, durationMinutes, busy).length > 0) warnings.push("conflit");
  return warnings;
}

/**
 * Créneaux de rendez-vous proposés : jours travaillés hors absences, sans chevauchement avec
 * l'agenda, au moins deux heures plus tard ; au plus un le matin et un l'après-midi, par pas de
 * 30 minutes. Sans horaires renseignés, les horaires proposés au départ servent de base.
 */
export function suggestSlots({
  hours,
  absences,
  busy,
  now,
  count = 4,
  durationMinutes = APPOINTMENT_DURATION_MINUTES,
  horizonDays = 21,
}: {
  hours: readonly HoursRange[];
  absences: readonly Absence[];
  busy: readonly BusySlot[];
  now: Date;
  count?: number;
  durationMinutes?: number;
  horizonDays?: number;
}): Date[] {
  const ranges = hours.length > 0 ? hours : SUGGESTED_HOURS;
  const earliest = now.getTime() + 2 * 60 * 60_000;
  const today = parisDateTime(now).date;
  const out: Date[] = [];
  for (let i = 0; i <= horizonDays && out.length < count; i++) {
    const date = addDays(today, i);
    if (absenceOn(absences, date)) continue;
    const starts = rangesOn(ranges, weekdayOf(date)).flatMap((r) => {
      const list: number[] = [];
      for (let m = timeToMinutes(r.start); m + durationMinutes <= timeToMinutes(r.end); m += 30) {
        list.push(m);
      }
      return list;
    });
    for (const [from, to] of [
      [0, NOON],
      [NOON, 24 * 60],
    ] as const) {
      if (out.length >= count) break;
      for (const m of starts) {
        if (m < from || m >= to) continue;
        const start = parisLocalToDate(date, minutesToTime(m));
        if (start.getTime() < earliest || slotConflicts(start, durationMinutes, busy).length > 0) {
          continue;
        }
        out.push(start);
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vue semaine
// ---------------------------------------------------------------------------

type Timed = { startMinutes: number; endMinutes: number };

/** Heures affichées par la grille : 8 h – 18 h au moins, élargies aux horaires et aux événements. */
export function gridSpan(
  hours: readonly HoursRange[],
  events: readonly Timed[],
): { start: number; end: number } {
  let start = 8 * 60;
  let end = 18 * 60;
  for (const h of hours) {
    start = Math.min(start, timeToMinutes(h.start));
    end = Math.max(end, timeToMinutes(h.end));
  }
  for (const e of events) {
    start = Math.min(start, e.startMinutes);
    end = Math.max(end, e.endMinutes);
  }
  return { start: Math.floor(start / 60) * 60, end: Math.min(24 * 60, Math.ceil(end / 60) * 60) };
}

/**
 * Événements d'une journée placés en colonnes : ceux qui se chevauchent s'affichent côte à côte,
 * sur autant de colonnes que le groupe en demande.
 */
export function layoutDay<T extends Timed>(
  items: readonly T[],
): { item: T; column: number; columns: number }[] {
  const sorted = [...items].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes,
  );
  const out: { item: T; column: number; columns: number }[] = [];
  let group: { item: T; column: number; columns: number }[] = [];
  let columnEnds: number[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;
  const close = () => {
    const columns = columnEnds.length;
    for (const placed of group) placed.columns = columns;
    group = [];
    columnEnds = [];
  };
  for (const item of sorted) {
    if (item.startMinutes >= groupEnd) close();
    let column = columnEnds.findIndex((end) => end <= item.startMinutes);
    if (column === -1) column = columnEnds.push(item.endMinutes) - 1;
    else columnEnds[column] = item.endMinutes;
    const placed = { item, column, columns: 1 };
    group.push(placed);
    out.push(placed);
    groupEnd = Math.max(groupEnd, item.endMinutes);
  }
  close();
  return out;
}

/** « occupe » : plage occupée lue dans le calendrier du téléphone (ADR 0203), sans détail. */
export type AgendaItemKind = "visite" | "demarrage" | "creneau" | "occupe";

/** Élément horaire de l'agenda (F-44) : visite, démarrage de chantier ou créneau bloqué. */
export type AgendaItem = {
  id: string;
  kind: AgendaItemKind;
  /** Instant ISO. */
  start: string;
  durationMinutes: number;
  /** Titre du chantier, ou motif du créneau bloqué. */
  title: string | null;
  /** Commune du chantier. */
  place: string | null;
  chantierId: string | null;
};

/**
 * Visites planifiées, démarrages de chantier et créneaux bloqués qui commencent entre deux instants
 * (chantiers annulés exclus), triés par heure : agenda du site et de l'application.
 * `excludeChantierId` : le rendez-vous en cours de modification.
 */
export function agendaItemsFrom({
  chantiers,
  blocked,
  external = [],
  from,
  to,
  excludeChantierId,
}: {
  chantiers: readonly {
    chantierId: string;
    status: string;
    title: string;
    codePostal: string | null;
    villeNom: string | null;
    appointmentAt: string | null;
    startAt: string | null;
  }[];
  blocked: readonly { id: string; startsAt: string; endsAt: string; label: string | null }[];
  /** Plages occupées du calendrier du téléphone (ADR 0203). */
  external?: readonly { id: string; startsAt: string; endsAt: string }[];
  from: Date;
  to: Date;
  excludeChantierId?: string;
}): AgendaItem[] {
  const within = (iso: string | null): iso is string => {
    if (!iso) return false;
    const at = new Date(iso).getTime();
    return at >= from.getTime() && at < to.getTime();
  };
  const items: AgendaItem[] = [];
  for (const c of chantiers) {
    if (c.status === "annule" || c.chantierId === excludeChantierId) continue;
    const place = [c.codePostal, c.villeNom].filter(Boolean).join(" ") || null;
    const base = { title: c.title, place, chantierId: c.chantierId };
    const durationMinutes = APPOINTMENT_DURATION_MINUTES;
    if (within(c.appointmentAt)) {
      items.push({
        ...base,
        id: `visite-${c.chantierId}`,
        kind: "visite",
        start: c.appointmentAt,
        durationMinutes,
      });
    }
    if (within(c.startAt)) {
      items.push({
        ...base,
        id: `demarrage-${c.chantierId}`,
        kind: "demarrage",
        start: c.startAt,
        durationMinutes,
      });
    }
  }
  for (const b of blocked) {
    items.push({
      id: b.id,
      kind: "creneau",
      start: b.startsAt,
      durationMinutes: Math.round(
        (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 60_000,
      ),
      title: b.label,
      place: null,
      chantierId: null,
    });
  }
  for (const e of external) {
    items.push({
      id: `occupe-${e.id}`,
      kind: "occupe",
      start: e.startsAt,
      durationMinutes: Math.round(
        (new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime()) / 60_000,
      ),
      title: null,
      place: null,
      chantierId: null,
    });
  }
  return items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/** Plage horaire d'une journée (HH:MM), dans l'éditeur d'horaires. */
export type DayRange = { start: string; end: string };
/** Horaires de la semaine, jour par jour. */
export type WeekHours = Record<Weekday, DayRange[]>;

/** Journée ouverte d'un geste : 8 h – 12 h et 13 h 30 – 17 h 30. */
export const DEFAULT_DAY_RANGES: readonly DayRange[] = [
  { start: "08:00", end: "12:00" },
  { start: "13:30", end: "17:30" },
];

const workdays = (ranges: readonly DayRange[], saturdayMorning = false): HoursRange[] =>
  ([1, 2, 3, 4, 5] as const)
    .flatMap((weekday) => ranges.map((r): HoursRange => ({ weekday, ...r })))
    .concat(saturdayMorning ? [{ weekday: 6, start: "08:00", end: "12:00" }] : []);

export type HoursPreset = "semaine" | "samedi" | "continue" | "vide";

/** Modèles d'horaires courants dans le bâtiment, dans l'ordre d'affichage. */
export const HOURS_PRESETS: Readonly<Record<HoursPreset, readonly HoursRange[]>> = {
  semaine: SUGGESTED_HOURS,
  samedi: workdays(DEFAULT_DAY_RANGES, true),
  continue: workdays([{ start: "07:30", end: "16:00" }]),
  vide: [],
};

/** Horaires rangés par jour de la semaine, plages dans l'ordre de la journée. */
export function weekHours(hours: readonly HoursRange[]): WeekHours {
  return Object.fromEntries(
    WEEKDAYS.map((d) => [
      d,
      hours
        .filter((h) => h.weekday === d)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map(({ start, end }) => ({ start, end })),
    ]),
  ) as WeekHours;
}

/** Horaires de la semaine remis à plat (contrôles, enregistrement). */
export function hoursOfWeek(week: WeekHours): HoursRange[] {
  return WEEKDAYS.flatMap((weekday) => week[weekday].map((r) => ({ weekday, ...r })));
}

/** Nouvelle plage après la dernière de la journée : une heure plus tard, pour deux heures. */
export function nextDayRange(ranges: readonly DayRange[]): DayRange {
  const last = ranges[ranges.length - 1];
  const startMinutes = last ? Math.min(timeToMinutes(last.end) + 60, 21 * 60) : 8 * 60;
  return {
    start: minutesToTime(startMinutes),
    end: minutesToTime(Math.min(startMinutes + 120, 23 * 60 + 45)),
  };
}

/** Horaires du lundi recopiés du mardi au vendredi. */
export function copyMondayToWeekdays(week: WeekHours): WeekHours {
  return {
    ...week,
    ...Object.fromEntries(([2, 3, 4, 5] as const).map((d) => [d, week[1].map((r) => ({ ...r }))])),
  };
}

/** Durée de travail de la semaine, en minutes. */
export function weeklyMinutes(hours: readonly HoursRange[]): number {
  return hours.reduce((sum, h) => sum + timeToMinutes(h.end) - timeToMinutes(h.start), 0);
}
