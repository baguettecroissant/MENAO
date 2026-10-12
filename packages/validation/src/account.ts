import { z } from "zod";
import { magicLinkSchema, passwordSchema, signUpSchema } from "./auth";
import { messages } from "./messages";

/** « Mes informations » (F-08) : mêmes règles qu'à l'inscription, téléphone facultatif (E.164). */
export const accountProfileSchema = signUpSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
});
export type AccountProfile = z.output<typeof accountProfileSchema>;

/** Nouvelle adresse e-mail, confirmée par lien avant de remplacer l'actuelle (ADR 0039). */
export const emailChangeSchema = magicLinkSchema;

/** Changement du mot de passe depuis l'espace : l'actuel, puis un nouveau, différent. */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { error: messages.required }),
    password: passwordSchema,
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ["password"],
    error: messages.passwordUnchanged,
  });

export const ACCOUNT_DELETION_MESSAGE_MAX_LENGTH = 1000;

/** Demande de suppression du compte : confirmation explicite, remarque facultative. */
export const accountDeletionSchema = z.object({
  confirm: z.literal(true, { error: messages.deletionConfirmRequired }),
  message: z
    .string()
    .trim()
    .max(ACCOUNT_DELETION_MESSAGE_MAX_LENGTH, { error: messages.tooLong })
    .optional()
    .transform((value) => value || undefined),
});
