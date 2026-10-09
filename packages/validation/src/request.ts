import { z } from "zod";
import { normalizePhone } from "./auth";
import { messages } from "./messages";

// Valeurs reprises de @menao/core (requests.ts) : le paquet de validation ne dépend que de Zod.
const MAX_ARTISANS = 3;
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
