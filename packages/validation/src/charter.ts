import {
  CHARTER_VERSION,
  charterChecklistComplete,
  isValidSiret,
  normalizeSiret,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/** Signature de la charte qualité (ADR 0104) : toutes les règles cochées, identité, tracé, accord. */
export const charterAcceptanceSchema = z.object({
  version: z.literal(CHARTER_VERSION, { error: messages.charterOutdated }),
  rules: z
    .array(z.string().regex(/^R\d{1,2}\.\d{1,2}$/))
    .max(60)
    .refine(charterChecklistComplete, { error: messages.charterRules }),
  name: z
    .string()
    .trim()
    .min(2, { error: messages.charterName })
    .max(120, { error: messages.tooLong }),
  company: z
    .string()
    .trim()
    .min(1, { error: messages.charterCompany })
    .max(160, { error: messages.tooLong }),
  siret: z
    .string({ error: messages.charterSiret })
    .transform(normalizeSiret)
    .refine(isValidSiret, { error: messages.charterSiret }),
  // Chemin SVG du tracé (M et L, coordonnées entières dans un cadre de 600 × 150).
  signature: z
    .string({ error: messages.charterSignature })
    .regex(/^M[ML0-9 .-]+$/, { error: messages.charterSignature })
    .min(10, { error: messages.charterSignature })
    .max(20000, { error: messages.charterSignature }),
  agree: z.literal(true, { error: messages.charterAgree }),
});
export type CharterAcceptance = z.output<typeof charterAcceptanceSchema>;
