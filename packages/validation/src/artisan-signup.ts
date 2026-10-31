import { z } from "zod";
import { signupZoneSchema, siretSchema, tradeCodesSchema } from "./artisan";
import { completeSignupSchema, signUpSchema } from "./auth";
import { messages } from "./messages";

/**
 * Inscription artisan en un seul parcours (ADR 0110) : ce que l'artisan choisit avant de créer
 * son compte (métiers, entreprise, zone autour du siège ou par territoire), envoyé en une fois avec le
 * compte. Le SIRET est revérifié auprès de l'INSEE après la création du compte.
 */
export const artisanSignupProfileSchema = z.object({
  tradeCodes: tradeCodesSchema,
  siret: siretSchema,
  isDirigeant: z.boolean({ error: messages.required }),
  assujettiTva: z.boolean({ error: messages.required }),
  zone: signupZoneSchema,
});
export type ArtisanSignupProfile = z.output<typeof artisanSignupProfileSchema>;

/**
 * Choix du parcours sous la forme lue par la base (`app.apply_artisan_signup`) : objet « signup »
 * des métadonnées d'inscription, ou paramètre de `complete_artisan_oauth_signup`. Le code d'un
 * lien partenaire (F-59) y est joint s'il y en a un.
 */
export function artisanSignupMetadata(profile: ArtisanSignupProfile, partnerCode?: string | null) {
  return {
    ...(partnerCode ? { partner_code: partnerCode } : {}),
    trade_codes: profile.tradeCodes,
    assujetti_tva: profile.assujettiTva,
    is_dirigeant: profile.isDirigeant,
    zone: {
      mode: profile.zone.mode,
      base_label: profile.zone.baseLabel,
      base_citycode: profile.zone.baseCitycode,
      lon: profile.zone.lon,
      lat: profile.zone.lat,
      ...("radiusKm" in profile.zone ? { radius_km: profile.zone.radiusKm } : {}),
      ...("territories" in profile.zone ? { territoires: profile.zone.territories } : {}),
    },
  };
}

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
