import { CLIENT_CANCEL_REASONS } from "@menao/core";
import { z } from "zod";
import { normalizePhone } from "./auth";
import { messages } from "./messages";

// Valeurs reprises de @menao/core (requests.ts) : le paquet de validation ne dépend que de Zod.
const MAX_ARTISANS = 3;
const MAX_LOTS = 4;
const REFUSAL_REASONS = ["planning_complet", "hors_expertise", "hors_zone", "autre"] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** F-11 : 1 à 3 artisans (doublons retirés). */
export const artisanSelectionSchema = z
  .array(z.uuid())
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.uuid())
      .min(1, { error: messages.selectArtisan })
      .max(MAX_ARTISANS, { error: messages.tooManyArtisans }),
  );

export type LotSelection = { projectId: string; artisanIds: string[] }[];

/**
 * Un seul envoi pour plusieurs métiers d'un chantier (ADR 0170) : artisans choisis dans les lots,
 * au format « <lot>.<artisan> », regroupés par lot (1 à 3 artisans par lot, 4 lots au plus).
 */
export const lotSelectionSchema = z
  .array(z.string().regex(/^[0-9a-f-]{36}\.[0-9a-f-]{36}$/i))
  .max(MAX_LOTS * MAX_ARTISANS, { error: messages.tooManyArtisans })
  .transform((values) => {
    const lots = new Map<string, string[]>();
    for (const value of values) {
      const [lot, artisan] = value.toLowerCase().split(".") as [string, string];
      const ids = lots.get(lot) ?? [];
      if (!ids.includes(artisan)) ids.push(artisan);
      lots.set(lot, ids);
    }
    return [...lots].map(([projectId, artisanIds]) => ({ projectId, artisanIds }));
  })
  .pipe(
    z
      .array(
        z.object({
          projectId: z.uuid(),
          artisanIds: z
            .array(z.uuid())
            .min(1)
            .max(MAX_ARTISANS, { error: messages.tooManyArtisans }),
        }),
      )
      .max(MAX_LOTS),
  );

/** Sélection par lot remise au format des adresses (`lot=<lot>.<artisan>`). */
export function encodeLotSelection(lots: LotSelection): string[] {
  return lots.flatMap((lot) => lot.artisanIds.map((artisan) => `${lot.projectId}.${artisan}`));
}

/** F-11 : message, téléphone (obligatoire : l'artisan rappelle), préférence de rappel. */
export const requestFormSchema = z
  .object({
    message: z.string().trim().max(10_000, { error: messages.tooLong }),
    phone: z.string().transform((value, ctx) => {
      if (value.trim() === "") {
        ctx.addIssue({ code: "custom", message: messages.phoneRequiredRequest });
        return z.NEVER;
      }
      const phone = normalizePhone(value);
      if (phone === null) {
        ctx.addIssue({ code: "custom", message: messages.phoneInvalid });
        return z.NEVER;
      }
      return phone;
    }),
    callbackMode: z.enum(["des_que_possible", "plage"], { error: messages.required }),
    callbackFrom: z.string().optional(),
    callbackTo: z.string().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.callbackMode !== "plage") return;
    if (!r.callbackFrom || !TIME.test(r.callbackFrom)) {
      ctx.addIssue({ code: "custom", path: ["callbackFrom"], message: messages.timeInvalid });
    }
    if (!r.callbackTo || !TIME.test(r.callbackTo)) {
      ctx.addIssue({ code: "custom", path: ["callbackTo"], message: messages.timeInvalid });
    } else if (r.callbackFrom && r.callbackTo <= r.callbackFrom) {
      ctx.addIssue({ code: "custom", path: ["callbackTo"], message: messages.timeRange });
    }
  })
  .transform((r) => ({
    message: r.message,
    phone: r.phone,
    callbackMode: r.callbackMode,
    callbackFrom: r.callbackMode === "plage" ? (r.callbackFrom ?? null) : null,
    callbackTo: r.callbackMode === "plage" ? (r.callbackTo ?? null) : null,
  }));

/** F-17 : refus avec motif ; précision obligatoire pour « autre ». */
export const refusalSchema = z
  .object({
    reason: z.enum(REFUSAL_REASONS, { error: messages.refusalReasonRequired }),
    detail: z.string().trim().max(500, { error: messages.tooLong }),
  })
  .superRefine((r, ctx) => {
    if (r.reason === "autre" && r.detail === "") {
      ctx.addIssue({ code: "custom", path: ["detail"], message: messages.required });
    }
  });

/** Annulation par le client (F-11, F-12) : motif de la liste, mot facultatif pour l'artisan. */
export const clientCancelSchema = z.object({
  reason: z.enum(CLIENT_CANCEL_REASONS, { error: messages.cancelReasonRequired }),
  comment: z
    .string()
    .trim()
    .max(500, { error: messages.tooLong })
    .optional()
    .transform((value) => value || undefined),
});
