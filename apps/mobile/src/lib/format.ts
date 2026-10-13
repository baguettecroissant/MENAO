import { fr } from "@/i18n/fr";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const numeric = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});
const dayLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const dayFull = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
const hourMinute = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** Montant en centimes (CLAUDE.md règle 5) affiché en euros : « 91,85 € ». */
export function formatCents(cents: number): string {
  return euros.format(cents / 100);
}

/** « 25/10/2026 » (heure de Paris). */
export function formatDateNumeric(iso: string): string {
  return numeric.format(new Date(iso));
}

/** « 25 octobre 2026 » (heure de Paris), comme sur le site. */
export function formatDay(iso: string): string {
  return dayLong.format(new Date(iso));
}

/** « dimanche 25 octobre » et « 08h30 », comme sur le site (heure de Paris). */
export function formatDayAndTime(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  return { day: longDay.format(date), time: hourMinute.format(date).replace(":", "h") };
}

/** « 08h30 » (heure de Paris). */
export function formatTime(iso: string): string {
  return hourMinute.format(new Date(iso)).replace(":", "h");
}

/** Séparateur de jour d'une conversation : « Aujourd'hui », « Hier » ou « lundi 12 octobre 2026 ». */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const day = parisDay.format(new Date(iso));
  if (day === parisDay.format(now)) return fr.ago.today;
  if (day === parisDay.format(new Date(now.getTime() - 86_400_000))) return fr.ago.yesterday;
  return dayFull.format(new Date(iso));
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « il y a 4 jours ». */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return fr.ago.now;
  if (minutes < 60) return fr.ago.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fr.ago.hours(hours);
  return fr.ago.days(Math.floor(hours / 24));
}
