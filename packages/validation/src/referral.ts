import { z } from "zod";

/**
 * Bilan du parrainage d'un artisan (F-60, ADR 0137), réponse de `my_referral` : code à partager,
 * confrères inscrits, parrainages récompensés et mois offerts gagnés. Null : pas encore validé.
 */
const referralSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{8}$/),
  joined: z.number().int().nonnegative(),
  rewarded: z.number().int().nonnegative(),
  months_earned: z.number().int().nonnegative(),
});
export type Referral = z.infer<typeof referralSchema>;

export function parseReferral(data: unknown): Referral | null {
  const parsed = referralSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
