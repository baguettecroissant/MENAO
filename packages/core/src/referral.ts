/**
 * Parrainage entre artisans, V2 (F-60, ADR 0154 ; décision des associés du 22 octobre 2026) :
 * - le parrain seul gagne un mois offert au premier paiement réel du filleul, 12 par année civile
 *   (heure de Paris) au plus ; la base applique le plafond (`record_subscription_payment`) ;
 * - le filleul, qui a déjà ses 2 mois d'essai, reçoit un cadeau de bienvenue à la validation de
 *   son dossier : un t-shirt (tailles des tenues, `REWARD_SIZES`) ou une casquette MENAO.
 * Réseau du parrain (ADR 0161) : suivi de chaque filleul, artisans partenaires sur la fiche,
 * « Recommandé par », QR code et message WhatsApp, propositions de parrainer au bon moment.
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

/**
 * Suivi de chaque filleul dans l'espace du parrain (`my_referrals`) : inscription en cours,
 * dossier validé (période d'essai), abonné (parrainage récompensé) ou non retenu (annulé).
 */
export const REFERRAL_STEPS = ["inscription", "valide", "abonne", "annule"] as const;
export type ReferralStep = (typeof REFERRAL_STEPS)[number];

/**
 * Moments où MENAO propose de parrainer un confrère (notification « parrainage_suggestion ») :
 * premier devis signé, premier paiement de l'abonnement (début du 3e mois, après les 2 mois
 * d'essai), nouvel avis 5 étoiles. Une proposition au plus tous les 7 jours.
 */
export const REFERRAL_SUGGESTION_MOMENTS = [
  "premier_chantier",
  "trois_mois",
  "avis_5_etoiles",
] as const;
export type ReferralSuggestionMoment = (typeof REFERRAL_SUGGESTION_MOMENTS)[number];
export const REFERRAL_SUGGESTION_COOLDOWN_DAYS = 7;

/** Artisans partenaires (filleuls) affichés au plus sur la fiche du parrain. */
export const REFERRAL_PARTNERS_SHOWN = 6;

/** Lien WhatsApp avec le message déjà rédigé : l'artisan choisit le destinataire. */
export function whatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * « Invitez votre artisan de confiance » (ADR 0162) : un particulier invite un artisan qui n'est
 * pas sur MENAO, 5 fois au plus sur 30 jours ; les coordonnées d'un artisan resté hors de MENAO
 * sont effacées 12 mois après l'invitation.
 */
export const ARTISAN_INVITATIONS_PER_PERIOD = 5;
export const ARTISAN_INVITATION_PERIOD_DAYS = 30;
export const ARTISAN_INVITATION_RETENTION_MONTHS = 12;
