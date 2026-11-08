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

/** « Samedi 7 novembre », au-dessus de la salutation de l'accueil (ADR 0245). */
export function formatToday(date: Date = new Date()): string {
  const text = longDay.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Montant en centimes (CLAUDE.md règle 5) affiché en euros : « 91,85 € ». */
export function formatCents(cents: number): string {
  return euros.format(cents / 100);
}

/** « 25/10/2026 » (heure de Paris). */
export function formatDateNumeric(iso: string): string {
  return numeric.format(new Date(iso));
}

const dayMonthNumeric = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
});

/** « 25/10 » (heure de Paris), dans les listes de devis comme sur le site. */
export function formatDayMonthNumeric(iso: string): string {
  return dayMonthNumeric.format(new Date(iso));
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

const parisParts = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Date (AAAA-MM-JJ) et heure (HH:MM) de Paris d'un instant : pré-remplissage des champs. */
export function parisDateTime(iso: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    parisParts.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/** « 12 octobre » (date AAAA-MM-JJ ou instant, heure de Paris), comme sur le site. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

const dayMonthShort = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

/** « mar. 13 oct. », au fil d'une phrase (absences), comme sur le site. */
export function formatDayMonthShort(iso: string): string {
  return dayMonthShort.format(new Date(iso));
}

/** Heure HH:MM → « 09h00 », comme sur le site. */
export function formatClock(hhmm: string): string {
  return hhmm.slice(0, 5).replace(":", "h");
}

/** Heure HH:MM → « 8 h », « 10 h 30 » (espaces insécables), dans l'agenda « Nette ». */
export function formatHour(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  return m === "00" ? `${h}\u00a0h` : `${h}\u00a0h\u00a0${m}`;
}

const dayShortMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Semaine (lundi, dimanche AAAA-MM-JJ) → « 9 – 15 nov. », « 26 oct. – 1 nov. ». */
export function formatWeekShort(monday: string, sunday: string): string {
  const to = dayShortMonth.format(new Date(`${sunday}T12:00:00Z`));
  if (monday.slice(0, 7) === sunday.slice(0, 7)) {
    return fr.proAgenda.weekShort(String(Number(monday.slice(8, 10))), to);
  }
  return fr.proAgenda.weekShort(dayShortMonth.format(new Date(`${monday}T12:00:00Z`)), to);
}

/** Mois AAAA-MM → « septembre », comme sur le site. */
export function formatMonthName(month: string): string {
  return monthName.format(new Date(`${month}-15T12:00:00Z`));
}

/** Durée en minutes → « 35 min », « 2 h 15 », « 1 j 3 h » (espaces insécables), comme sur le site. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}\u00a0min`;
  if (m < 24 * 60) {
    const rest = m % 60;
    return rest
      ? `${Math.floor(m / 60)}\u00a0h\u00a0${String(rest).padStart(2, "0")}`
      : `${m / 60}\u00a0h`;
  }
  const hours = Math.floor((m % (24 * 60)) / 60);
  return `${Math.floor(m / (24 * 60))}\u00a0j${hours ? `\u00a0${hours}\u00a0h` : ""}`;
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
