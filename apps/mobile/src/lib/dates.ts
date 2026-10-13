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

/** « 25 octobre 2026 ». */
export function formatLongDate(iso: string): string {
  return longDate.format(fromIsoDate(iso));
}
