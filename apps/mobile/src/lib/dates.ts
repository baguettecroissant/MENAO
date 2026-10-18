import { parisToday } from "@menao/core";

/** Dates du calendrier au format AAAA-MM-JJ, lues et écrites en heure locale (sans décalage UTC). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * « 25 octobre 2026 ». Accepte une date AAAA-MM-JJ ou un horodatage (vérification Sirene ou RGE,
 * échéance Stripe), affiché au jour de Paris.
 */
export function formatLongDate(iso: string): string {
  if (iso.length <= 10) return longDate.format(fromIsoDate(iso));
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : longDate.format(fromIsoDate(parisToday(at)));
}
