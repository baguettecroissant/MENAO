import { z } from "zod";
import { messages } from "./messages";

/** Fermetures exceptionnelles de l'accueil (F-81, ADR 0230) : 100 dates au plus, 2020 à 2040. */
export const RECEPTION_CLOSED_DATES_MAX = 100;

const FRENCH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** « 24/12/2026 » ou « 2026-12-24 » → « 2026-12-24 » ; null si la date n'existe pas. */
function isoDate(value: string): string | null {
  const fr = FRENCH_DATE.exec(value);
  const iso = ISO_DATE.exec(value);
  const [y, m, d] = fr
    ? [Number(fr[3]), Number(fr[2]), Number(fr[1])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [0, 0, 0];
  if (y < 2020 || y > 2040) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Formulaire des fermetures : une date par ligne (ou séparées par des virgules), jours fériés
 * fermés ou non. Dates triées, sans doublon.
 */
export const receptionClosuresSchema = z
  .object({
    fermetures: z.string().max(3000, { error: messages.tooLong }),
    feries: z.boolean(),
  })
  .transform((values, ctx) => {
    const parts = values.fermetures
      .split(/[\n,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const dates: string[] = [];
    for (const part of parts) {
      const date = isoDate(part);
      if (!date) {
        ctx.addIssue({
          code: "custom",
          path: ["fermetures"],
          message: messages.receptionDateInvalid(part),
        });
        return z.NEVER;
      }
      dates.push(date);
    }
    const closedDates = [...new Set(dates)].sort();
    if (closedDates.length > RECEPTION_CLOSED_DATES_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["fermetures"],
        message: messages.receptionTooManyDates,
      });
      return z.NEVER;
    }
    return { closedDates, holidaysClosed: values.feries };
  });
export type ReceptionClosures = z.output<typeof receptionClosuresSchema>;
