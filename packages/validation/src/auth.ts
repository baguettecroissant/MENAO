import { z } from "zod";
import { messages } from "./messages";

export const PASSWORD_MIN_LENGTH = 12;
/** Limite de bcrypt utilisée par Supabase Auth. */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Normalise un numéro au format E.164. Sans indicatif, un numéro à 10 chiffres
 * commençant par 0 (ou à 9 chiffres, saisi après l'indicatif +33 affiché) est considéré
 * comme français (+33, spec F-08).
 * Retourne `null` si le numéro est invalide.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, "");
  let e164: string;
  if (/^0[1-9]\d{8}$/.test(compact)) e164 = `+33${compact.slice(1)}`;
  // Champ précédé de l'indicatif « +33 » affiché (maquettes) : 9 chiffres sans le 0.
  else if (/^[1-9]\d{8}$/.test(compact)) e164 = `+33${compact}`;
  else if (compact.startsWith("00")) e164 = `+${compact.slice(2)}`;
  else e164 = compact;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: messages.emailInvalid }));

const name = z
  .string({ error: messages.required })
  .trim()
  .min(1, { error: messages.required })
  .max(100, { error: messages.tooLong });

const optionalPhone = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") return undefined;
    const phone = normalizePhone(value);
    if (phone === null) {
      ctx.addIssue({ code: "custom", message: messages.phoneInvalid });
      return z.NEVER;
    }
    return phone;
  });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: messages.passwordTooShort })
  .max(PASSWORD_MAX_LENGTH, { error: messages.passwordTooLong });

export const signUpSchema = z.object({
  firstName: name,
  lastName: name,
  phone: optionalPhone,
  email,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: messages.termsRequired }),
  marketingOptIn: z.boolean().default(false),
});
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUp = z.output<typeof signUpSchema>;

/** « Finaliser mon compte » après Google ou Apple (ADR 0108) : l'adresse vient du fournisseur. */
export const completeSignupSchema = signUpSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  acceptTerms: true,
  marketingOptIn: true,
});
export type CompleteSignup = z.output<typeof completeSignupSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: messages.required }),
});
export type SignIn = z.output<typeof signInSchema>;

export const magicLinkSchema = z.object({ email });

/** Demande de réinitialisation : même forme que le lien magique (e-mail seul). */
export const passwordResetRequestSchema = magicLinkSchema;

export const newPasswordSchema = z.object({ password: passwordSchema });
export type MagicLink = z.output<typeof magicLinkSchema>;
