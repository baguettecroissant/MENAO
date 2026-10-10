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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
