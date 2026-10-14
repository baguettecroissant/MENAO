import { REWARD_SIZES } from "@menao/core";
import { z } from "zod";
import { normalizePhone } from "./auth";
import { messages } from "./messages";

/**
 * F-24 « Réclamez votre récompense » : tailles de la tenue, adresse de livraison et téléphone
 * (format international), mêmes règles qu'en base (artisan_claim_reward).
 */
export const rewardClaimSchema = z.object({
  jacket_size: z.enum(REWARD_SIZES, { error: messages.rewardSizeRequired }),
  pants_size: z.enum(REWARD_SIZES, { error: messages.rewardSizeRequired }),
  address: z
    .string()
    .trim()
    .min(5, { error: messages.rewardAddressRequired })
    .max(200, { error: messages.tooLong }),
  city: z
    .string()
    .trim()
    .min(1, { error: messages.rewardCityRequired })
    .max(100, { error: messages.tooLong }),
  country: z
    .string()
    .trim()
    .min(2, { error: messages.rewardCountryRequired })
    .max(60, { error: messages.tooLong }),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (phone === null) {
      ctx.addIssue({ code: "custom", message: messages.phoneInvalid });
      return z.NEVER;
    }
    return phone;
  }),
});
export type RewardClaim = z.infer<typeof rewardClaimSchema>;

/** Progression lue par `artisan_grade` (F-24) : écrans « Mon grade MENAO » du site et de l'app. */
export const gradeSchema = z.object({
  xp: z.number().int(),
  level: z.number().int(),
  levels: z.array(
    z.object({
      level: z.number().int(),
      xp_min: z.number().int(),
      reward: z.string().nullable(),
      reward_detail: z.string().nullable(),
    }),
  ),
  objectives: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      description: z.string(),
      xp: z.number().int(),
      target: z.number().int(),
      progress: z.number().int(),
      achieved_at: z.string().nullable(),
    }),
  ),
  badges: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      description: z.string(),
      target: z.number().int(),
      progress: z.number().int(),
      unlocked_at: z.string().nullable(),
      seen: z.boolean(),
    }),
  ),
  claims: z.array(z.object({ level: z.number().int(), created_at: z.string() })),
});
export type Grade = z.infer<typeof gradeSchema>;

/** Réponse d'`artisan_grade` validée, ou null si elle est inattendue. */
export function parseGrade(data: unknown): Grade | null {
  const parsed = gradeSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
