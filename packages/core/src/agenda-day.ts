/**
 * Journée de l'agenda de l'artisan (F-44, refonte « Nette », lot 4) : éléments placés à l'heure de
 * Paris, jour choisi par défaut, rendez-vous des jours suivants et plages libres d'une journée
 * (horaires de travail moins rendez-vous, démarrages et créneaux bloqués). Dates AAAA-MM-JJ.
 */
import {
  absenceOn,
  addDays,
  minutesToTime,
  parisDateTime,
  rangesOn,
  timeToMinutes,
  weekdayOf,
  type Absence,
  type AgendaItem,
  type HoursRange,
} from "./agenda";

/** Élément de l'agenda placé sur sa journée : date, heures de début et de fin (minutes). */
export type PlacedAgendaItem<T extends AgendaItem = AgendaItem> = T & {
  date: string;
  startMinutes: number;
  endMinutes: number;
};

/** Jour et heures (à Paris) d'un élément de l'agenda, sans déborder sur le lendemain. */
export function placeAgendaItem<T extends AgendaItem>(item: T): PlacedAgendaItem<T> {
  const { date, minutes } = parisDateTime(new Date(item.start));
  return {
    ...item,
    date,
    startMinutes: minutes,
    endMinutes: Math.min(24 * 60, minutes + item.durationMinutes),
  };
}

/** Jour choisi à l'ouverture d'une semaine : aujourd'hui s'il en fait partie, sinon le lundi. */
export function defaultAgendaDay(monday: string, today: string): string {
  return today >= monday && today <= addDays(monday, 6) ? today : monday;
}

/** Éléments des jours qui suivent `day` dans la même semaine (« Plus tard cette semaine »), dans l'ordre. */
export function agendaItemsAfter<T extends { date: string; startMinutes: number }>(
  items: readonly T[],
  day: string,
  sunday: string,
): T[] {
  return items
    .filter((i) => i.date > day && i.date <= sunday)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
}

/** Plage libre d'une journée (HH:MM). */
export type FreeRange = { start: string; end: string };

/** Plage libre la plus courte annoncée : une heure. */
export const FREE_RANGE_MIN_MINUTES = 60;

/**
 * Plages libres d'une journée : ses horaires de travail moins les éléments de l'agenda (un
 * démarrage de chantier occupe la journée à partir de son heure). Rien un jour d'absence, un jour
 * passé ou sans horaires ; aujourd'hui, seulement ce qui reste après `now` (arrondi à la
 * demi-heure suivante). Plages d'une heure au moins.
 */
export function freeRangesOn({
  date,
  hours,
  absences = [],
  items,
  now,
  minMinutes = FREE_RANGE_MIN_MINUTES,
}: {
  date: string;
  hours: readonly HoursRange[];
  absences?: readonly Absence[];
  items: readonly Pick<PlacedAgendaItem, "kind" | "date" | "startMinutes" | "endMinutes">[];
  now?: Date;
  minMinutes?: number;
}): FreeRange[] {
  if (absenceOn(absences, date)) return [];
  let floor = 0;
  if (now) {
    const current = parisDateTime(now);
    if (date < current.date) return [];
    if (date === current.date) floor = Math.ceil(current.minutes / 30) * 30;
  }
  const busy = items
    .filter((i) => i.date === date)
    .map((i) => ({
      start: i.startMinutes,
      end: i.kind === "demarrage" ? 24 * 60 : i.endMinutes,
    }));
  const out: FreeRange[] = [];
  for (const range of rangesOn(hours, weekdayOf(date))) {
    // Morceaux libres de la plage, découpés par chaque élément qui la chevauche.
    let pieces = [
      { start: Math.max(timeToMinutes(range.start), floor), end: timeToMinutes(range.end) },
    ];
    for (const b of busy) {
      pieces = pieces.flatMap((p) =>
        b.end <= p.start || b.start >= p.end
          ? [p]
          : [
              { start: p.start, end: Math.min(p.end, b.start) },
              { start: Math.max(p.start, b.end), end: p.end },
            ],
      );
    }
    for (const p of pieces) {
      if (p.end - p.start >= minMinutes) {
        out.push({ start: minutesToTime(p.start), end: minutesToTime(p.end) });
      }
    }
  }
  return out;
}
