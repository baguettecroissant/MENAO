import { z } from "zod";
import { normalizePhone } from "./auth";
import { messages } from "./messages";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: messages.tooLong })
    .transform((value) => value || null);

/**
 * « Être rappelé » depuis l'assistant des pages Pro (ADR 0218), mêmes règles qu'en base
 * (`request_pro_callback`) : prénom, téléphone (normalisé en +33…) et e-mail obligatoires, métier
 * et commune facultatifs, accord explicite pour être rappelé.
 */
export const proCallbackSchema = z.object({
  first_name: z
    .string({ error: messages.callbackFirstName })
    .trim()
    .min(1, { error: messages.callbackFirstName })
    .max(60, { error: messages.tooLong }),
  phone: z
    .string({ error: messages.callbackPhone })
    .trim()
    .transform((value, ctx) => {
      const e164 = normalizePhone(value);
      if (!e164) ctx.addIssue({ code: "custom", message: messages.callbackPhone });
      return e164 ?? "";
    }),
  email: z
    .string({ error: messages.emailInvalid })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: messages.emailInvalid }).max(254, { error: messages.tooLong })),
  trade: optionalText(80),
  city: optionalText(100),
  consent: z.literal(true, { error: messages.callbackConsent }),
});
export type ProCallback = z.infer<typeof proCallbackSchema>;
