/**
 * Parrainage entre artisans, V2 (F-60, ADR 0154 ; décision des associés du 22 octobre 2026) :
 * - le parrain seul gagne un mois offert au premier paiement réel du filleul, 12 par année civile
 *   (heure de Paris) au plus ; la base applique le plafond (`record_subscription_payment`) ;
 * - le filleul, qui a déjà ses 2 mois d'essai, reçoit un cadeau de bienvenue à la validation de
 *   son dossier : un t-shirt (tailles des tenues, `REWARD_SIZES`) ou une casquette MENAO.
 */

/** Mois offerts au plus par parrain et par année civile. */
export const REFERRAL_MONTHS_PER_YEAR = 12;

export const WELCOME_GIFT_ITEMS = ["tshirt", "casquette"] as const;
export type WelcomeGiftItem = (typeof WELCOME_GIFT_ITEMS)[number];

/** Mois gagnés cette année (bornés au plafond), mois encore possibles et plafond atteint. */
export function referralProgress(monthsThisYear: number): {
  earned: number;
  left: number;
  capped: boolean;
} {
  const n = Number.isFinite(monthsThisYear) ? Math.floor(monthsThisYear) : 0;
  const earned = Math.min(REFERRAL_MONTHS_PER_YEAR, Math.max(0, n));
  return {
    earned,
    left: REFERRAL_MONTHS_PER_YEAR - earned,
    capped: earned === REFERRAL_MONTHS_PER_YEAR,
  };
}
