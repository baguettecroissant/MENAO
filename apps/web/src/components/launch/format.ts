import { fr } from "@/i18n/fr";

/**
 * Dates des tableaux de lancement (F-66) : jours AAAA-MM-JJ sans heure, affichés tels quels (lus à
 * midi UTC pour qu'aucun fuseau ne les décale d'un jour).
 */
const at = (date: string) => new Date(`${date}T12:00:00Z`);
const dayShort = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayOnly = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });

/** « mar. 15 déc. » */
export const launchDate = (date: string) => dayShort.format(at(date));

/** « 15 déc. » */
export const launchDayMonth = (date: string) => dayMonth.format(at(date));

/** « du 2 au 8 nov. », ou « du 30 nov. au 6 déc. » à cheval sur deux mois. */
export function launchRange(from: string, to: string) {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return fr.commercialLaunch.board.range(
    (sameMonth ? dayOnly : dayMonth).format(at(from)),
    dayMonth.format(at(to)),
  );
}
