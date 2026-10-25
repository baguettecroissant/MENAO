import { ACCOUNTANT_PERIODS } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/** Réglages de l'envoi au comptable (F-63) : adresse, rythme et parties envoyées. */
export const accountantSettingsSchema = z
  .object({
    enabled: z.boolean(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: messages.tooLong })
      .pipe(z.email({ error: messages.emailInvalid })),
    period: z.enum(ACCOUNTANT_PERIODS, { error: messages.required }),
    includeInvoices: z.boolean(),
    includeExpenses: z.boolean(),
  })
  .refine((settings) => settings.includeInvoices || settings.includeExpenses, {
    path: ["includeExpenses"],
    error: messages.accountantPartsRequired,
  });
export type AccountantSettings = z.output<typeof accountantSettingsSchema>;
