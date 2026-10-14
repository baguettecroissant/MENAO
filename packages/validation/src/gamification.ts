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
