/** Formats d'affichage des dates et heures, toujours à l'heure de Paris. */

const PARIS = "Europe/Paris";
const dayLong = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: PARIS,
});
const dayMedium = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: PARIS });
const clock = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PARIS,
});
const isoDay = new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS });
const numeric = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: PARIS,
});
const dayFull = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: PARIS,
});
const dayShort = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: PARIS,
});

const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: PARIS,
});
const dayMonthShort = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: PARIS,
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « 12 octobre » (date AAAA-MM-JJ ou instant). */
export const formatDayMonth = (iso: string) => dayMonth.format(new Date(iso));

/** « mar. 13 oct. », au fil d'une phrase (créneaux proposés, absences). */
export const formatDayMonthShort = (iso: string) => dayMonthShort.format(new Date(iso));

/** « Vendredi 20 févr. 2026 » (maquette « Informations du rendez-vous »). */
export const formatDayLong = (iso: string) => capitalize(dayLong.format(new Date(iso)));

/** « vendredi 20 févr. 2026 », au fil d'une phrase. */
export const formatDayInline = (iso: string) => dayLong.format(new Date(iso));

/** « 20 février 2026 ». */
export const formatDay = (iso: string) => dayMedium.format(new Date(iso));

/** « 16h30 ». */
export const formatTime = (iso: string) => clock.format(new Date(iso)).replace(":", "h");

/** Heure saisie « 16:30 » (ou « 16:30:00 ») → « 16h30 ». */
export const formatClock = (hhmm: string) => hhmm.slice(0, 5).replace(":", "h");

/** Valeurs des champs date (AAAA-MM-JJ) et heure (HH:MM) pour un instant donné. */
export function parisInputValues(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return { date: isoDay.format(d), time: clock.format(d) };
}

/** « 28/02/2026 » (pastilles des maquettes « Mes chantiers »). */
export const formatDateNumeric = (iso: string) => numeric.format(new Date(iso));

/** « jeudi 28 févr. », au fil d'une phrase. */
export const formatDayShort = (iso: string) => dayShort.format(new Date(iso));

/** « jeudi 28 février 2026 ». */
export const formatDayFull = (iso: string) => dayFull.format(new Date(iso));

/** « Jeudi 28 févr. à 08h30 » (maquette « Prochaine intervention »). */
export const formatDayTime = (iso: string) =>
  `${capitalize(dayShort.format(new Date(iso)))} à ${formatTime(iso)}`;

/** « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.floor(minutes / 60)} h`;
  if (minutes < 30 * 24 * 60) return `il y a ${Math.floor(minutes / (24 * 60))} j`;
  return `le ${formatDateNumeric(iso)}`;
}
