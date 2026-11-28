import {
  emptySignupDraft,
  parseSignupDraft,
  signupBaseFromCompany,
  ZONE_RADIUS_OPTIONS_KM,
  type ArtisanSignupCompany,
  type ArtisanSignupDraft,
} from "./artisan-signup";

/**
 * Inscription préparée par un conseiller (F-195, lot 84, ADR 0395) : le conseiller saisit
 * l'entreprise, les métiers, la zone et le contact de l'artisan, avec son accord ; l'artisan reçoit
 * un lien personnel (avec le code du conseiller), vérifie, puis finit lui-même son inscription
 * (dirigeant, TVA, mot de passe, CGV, code reçu par e-mail). Le conseiller ne voit jamais ni mot
 * de passe ni code, et ne reçoit aucun document.
 */

/** Durée de vie d'un lien : ses informations sont effacées s'il n'est pas ouvert à temps. */
export const PREPARED_SIGNUP_TTL_DAYS = 7;
/** Lien ouvert mais inscription pas finie : informations effacées après ce délai. */
export const PREPARED_SIGNUP_KEEP_DAYS = 30;
export const PREPARED_SIGNUP_KEY_PATTERN = /^[a-f0-9]{32}$/;
export const PREPARED_NAME_MAX_LENGTH = 80;

export type PreparedSignupState = "envoye" | "ouvert" | "expire" | "inscrit";

/** État d'une inscription préparée à un instant donné. */
export function preparedSignupState(
  row: { expiresAt: string; openedAt: string | null; convertedAt: string | null },
  now: Date = new Date(),
): PreparedSignupState {
  if (row.convertedAt) return "inscrit";
  if (row.openedAt) return "ouvert";
  return new Date(row.expiresAt).getTime() <= now.getTime() ? "expire" : "envoye";
}

/** Jours restants avant l'expiration d'un lien pas encore ouvert (au moins 0). */
export function preparedSignupDaysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}

/**
 * Brouillon d'inscription préparé : entreprise, métiers, zone en rayon autour du siège. Dirigeant
 * et TVA restent vides : c'est l'artisan qui répond, au premier écran de son parcours.
 */
export function preparedSignupDraft(input: {
  company: ArtisanSignupCompany;
  tradeCodes: readonly string[];
  radiusKm: number;
}): ArtisanSignupDraft {
  const radius = (ZONE_RADIUS_OPTIONS_KM as readonly number[]).includes(input.radiusKm)
    ? input.radiusKm
    : emptySignupDraft().radiusKm;
  return parseSignupDraft({
    ...emptySignupDraft(),
    tradeCodes: [...input.tradeCodes],
    company: input.company,
    isDirigeant: null,
    assujettiTva: null,
    base: signupBaseFromCompany(input.company),
    zoneMode: "rayon",
    radiusKm: radius,
  });
}

/** Le brouillon lu en base, revérifié avant d'être rendu à l'artisan. */
export function preparedDraftFromStored(value: unknown): ArtisanSignupDraft {
  const draft = parseSignupDraft(value);
  return { ...draft, isDirigeant: null, assujettiTva: null };
}

/** Message prêt à envoyer depuis le téléphone du conseiller (SMS ou e-mail). */
export function preparedSignupMessage(
  link: string,
  artisanFirstName: string | null,
  advisor: string,
): string {
  const hello = artisanFirstName ? `Bonjour ${artisanFirstName},` : "Bonjour,";
  return `${hello} voici le lien pour finir votre inscription sur MENAO, préparée avec ${advisor} : ${link} . Il est valable ${PREPARED_SIGNUP_TTL_DAYS} jours.`;
}

/**
 * Avancement d'un artisan inscrit pour le suivi du conseiller : étapes du dossier faites sur le
 * total, d'après les étapes manquantes renvoyées par la base.
 */
export function preparedProgress(
  status: string | null,
  missing: readonly string[],
  total = 7,
): number {
  if (status === "valide" && missing.length === 0) return total;
  if (status === "en_verification") return total - 1;
  return Math.max(1, Math.min(total - 2, total - 2 - missing.length));
}
