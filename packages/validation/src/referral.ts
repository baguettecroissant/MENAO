import { REWARD_SIZES, WELCOME_GIFT_ITEMS } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/**
 * Bilan du parrainage d'un artisan (F-60, ADR 0137 et 0154), réponse de `my_referral` : code à
 * partager, confrères inscrits, parrainages récompensés, mois offerts gagnés en tout et sur l'année
 * civile en cours (12 au plus). Null : pas encore validé.
 */
const referralSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{8}$/),
  joined: z.number().int().nonnegative(),
  rewarded: z.number().int().nonnegative(),
  months_earned: z.number().int().nonnegative(),
  months_this_year: z.number().int().nonnegative(),
});
export type Referral = z.infer<typeof referralSchema>;

export function parseReferral(data: unknown): Referral | null {
  const parsed = referralSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Cadeau de bienvenue du filleul (ADR 0154), réponse de `my_welcome_gift` : état (à choisir,
 * demandé à l'équipe, envoyé), choix, adresse de livraison (pré-remplie avec celle de l'entreprise
 * tant que rien n'est choisi) et parrain. Null : aucun cadeau (inscrit sans parrain, dossier pas
 * encore validé ou parrainage annulé).
 */
const welcomeGiftSchema = z.object({
  status: z.enum(["a_choisir", "a_envoyer", "envoye"]),
  item: z.enum(WELCOME_GIFT_ITEMS).nullable(),
  size: z.enum(REWARD_SIZES).nullable(),
  address: z.object({
    recipient: z.string().nullable(),
    ligne: z.string().nullable(),
    code_postal: z.string().nullable(),
    commune: z.string().nullable(),
  }),
  referrer: z.string(),
  sent_at: z.string().nullable(),
});
export type WelcomeGift = z.infer<typeof welcomeGiftSchema>;

export function parseWelcomeGift(data: unknown): WelcomeGift | null {
  const parsed = welcomeGiftSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

const filled = (required: string, max: number) =>
  z
    .string({ error: required })
    .trim()
    .min(1, { error: required })
    .max(max, { error: messages.tooLong });

/**
 * Choix du cadeau (site et application), mêmes règles qu'en base (`choose_welcome_gift`) : la
 * taille ne vaut que pour le t-shirt.
 */
export const welcomeGiftChoiceSchema = z
  .object({
    item: z.enum(WELCOME_GIFT_ITEMS, { error: messages.welcomeGiftRequired }),
    size: z.enum(REWARD_SIZES).nullish(),
    recipient: filled(messages.welcomeGiftRecipientRequired, 120),
    ligne: filled(messages.welcomeGiftAddressRequired, 300),
    code_postal: z
      .string({ error: messages.postalCodeInvalid })
      .trim()
      .regex(/^[0-9]{5}$/, { error: messages.postalCodeInvalid }),
    commune: filled(messages.welcomeGiftCityRequired, 100),
  })
  .superRefine((value, ctx) => {
    if (value.item === "tshirt" && !value.size) {
      ctx.addIssue({ code: "custom", path: ["size"], message: messages.welcomeGiftSizeRequired });
    }
  })
  .transform((value) => ({
    ...value,
    size: value.item === "tshirt" ? (value.size ?? null) : null,
  }));
export type WelcomeGiftChoice = z.infer<typeof welcomeGiftChoiceSchema>;
