/**
 * Mise en forme des valeurs du PDF (français) et compatibilité avec les polices standard du PDF
 * (encodage WinAnsi). Les imports portent leur extension : ce paquet est aussi chargé par Deno.
 */
import { formatQuantity, type QuoteUnit } from "../../core/src/quote.ts";

// Caractères de la plage 0x80–0x9F de WinAnsi (le reste du jeu suit Latin-1).
const WIN_ANSI_EXTRA = new Set(
  "\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178",
);

/**
 * Texte affichable avec Helvetica (WinAnsi) : espaces fines remplacées par des insécables,
 * caractères hors jeu (émojis, alphabets non latins) remplacés par « ? ».
 */
export function winAnsi(text: string): string {
  return text
    .replace(/[\u202f\u2009\u2007]/g, "\u00a0")
    .replace(/\t/g, " ")
    .replace(/[^\u0020-\u007e\u00a0-\u00ff]/gu, (c) => (WIN_ANSI_EXTRA.has(c) ? c : "?"));
}

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** 123456 → « 1 234,56 € ». */
export const money = (cents: number) => winAnsi(euros.format(cents / 100));

/** « 2026-02-20 » → « 20 février 2026 ». */
export const dateLong = (isoDate: string) =>
  winAnsi(longDate.format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)));

/** 550 → « 5,5 % ». */
export const vatRate = (bp: number) => winAnsi(`${(bp / 100).toLocaleString("fr-FR")}\u00a0%`);

export const quantity = (milli: number) => winAnsi(formatQuantity(milli));

/** 1 → « 1 jour », 3 → « 3 jours ». */
export const days = (count: number) => (count === 1 ? "1 jour" : `${count} jours`);

/** « +33612345678 » → « 06 12 34 56 78 » ; numéros étrangers inchangés. */
export function phoneNumber(e164: string): string {
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `0${m.slice(1).join(" ")}` : e164;
}

const UNIT_LABELS: Record<QuoteUnit, string> = {
  u: "u",
  h: "h",
  jour: "jour",
  m: "m",
  ml: "ml",
  m2: "m\u00b2",
  m3: "m\u00b3",
  kg: "kg",
  l: "l",
  forfait: "forfait",
};

export const unit = (value: QuoteUnit) => UNIT_LABELS[value];
