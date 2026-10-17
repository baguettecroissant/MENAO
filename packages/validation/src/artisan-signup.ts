import { z } from "zod";
import { radiusZoneSchema, siretSchema, tradeCodesSchema } from "./artisan";
import { completeSignupSchema, signUpSchema } from "./auth";
import { messages } from "./messages";

/**
 * Inscription artisan en un seul parcours (ADR 0110) : ce que l'artisan choisit avant de créer
 * son compte (métiers, entreprise, zone en rayon autour du siège), envoyé en une fois avec le
 * compte. Le SIRET est revérifié auprès de l'INSEE après la création du compte.
 */
export const artisanSignupProfileSchema = z.object({
  tradeCodes: tradeCodesSchema,
  siret: siretSchema,
  isDirigeant: z.boolean({ error: messages.required }),
  assujettiTva: z.boolean({ error: messages.required }),
  zone: radiusZoneSchema,
});
export type ArtisanSignupProfile = z.output<typeof artisanSignupProfileSchema>;

const phoneRequired = (v: { phone?: string }) => v.phone !== undefined;
const cgv = z.literal(true, { error: messages.cgvRequired });

/** Compte par e-mail : téléphone obligatoire et CGV artisans en plus des CGU. */
export const artisanAccountSchema = signUpSchema
  .extend({ acceptCgv: cgv })
  .refine(phoneRequired, { path: ["phone"], error: messages.phoneRequired });
export type ArtisanAccount = z.output<typeof artisanAccountSchema>;

/** Compte Google ou Apple à finaliser : l'adresse vient du fournisseur (ADR 0108). */
export const artisanOAuthAccountSchema = completeSignupSchema
  .extend({ acceptCgv: cgv })
  .refine(phoneRequired, { path: ["phone"], error: messages.phoneRequired });
export type ArtisanOAuthAccount = z.output<typeof artisanOAuthAccountSchema>;

/** Code à 6 chiffres reçu par e-mail pour confirmer l'adresse. */
export const emailCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: messages.emailInvalid })),
  code: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 6, { error: messages.emailCodeInvalid }),
});
