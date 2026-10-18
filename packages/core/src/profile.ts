/** Fiche publique de l'artisan (F-10) : conseils pour la rendre plus convaincante. */

/** Une présentation développée et quelques photos rassurent les particuliers. */
export const PROFILE_GOOD_PRESENTATION_LENGTH = 300;
export const PROFILE_GOOD_PHOTO_COUNT = 3;
/** Photos de réalisations au plus (miroir de MAX_PORTFOLIO_PHOTOS dans process-upload). */
export const PORTFOLIO_MAX_PHOTOS = 12;

export type ProfileTip =
  | "assure_verifie"
  | "photo_profil"
  | "realisations"
  | "presentation"
  | "specialites"
  | "certifications";

export type ProfileFacts = {
  hasAvatar: boolean;
  presentationLength: number;
  photoCount: number;
  workTypeCount: number;
  certificationCount: number;
  /** Badge « Assuré et vérifié » obtenu (ADR 0119). */
  verified: boolean;
};

/** Conseils encore à suivre, dans l'ordre de leur effet sur les demandes reçues. */
export function profileTips(p: ProfileFacts): ProfileTip[] {
  const tips: ProfileTip[] = [];
  if (!p.verified) tips.push("assure_verifie");
  if (!p.hasAvatar) tips.push("photo_profil");
  if (p.photoCount < PROFILE_GOOD_PHOTO_COUNT) tips.push("realisations");
  if (p.presentationLength < PROFILE_GOOD_PRESENTATION_LENGTH) tips.push("presentation");
  if (p.workTypeCount === 0) tips.push("specialites");
  if (p.certificationCount === 0) tips.push("certifications");
  return tips;
}

/**
 * Poids de chaque élément dans la jauge « Fiche complète à X % » de « Mon profil » (ADR 0129),
 * dans l'ordre des conseils : total 100.
 */
export const PROFILE_STRENGTH_WEIGHTS: Record<ProfileTip, number> = {
  assure_verifie: 25,
  photo_profil: 20,
  realisations: 20,
  presentation: 15,
  specialites: 10,
  certifications: 10,
};

/**
 * Jauge de la fiche : part de chaque élément obtenue (réalisations et présentation comptent au
 * prorata, jusqu'à 3 photos et 300 caractères), arrondie à l'inférieur pour n'afficher 100 % que
 * pour une fiche complète ; `next` : le conseil le plus utile à suivre maintenant.
 */
export function profileStrength(p: ProfileFacts): { percent: number; next: ProfileTip | null } {
  const share: Record<ProfileTip, number> = {
    assure_verifie: p.verified ? 1 : 0,
    photo_profil: p.hasAvatar ? 1 : 0,
    realisations: Math.min(p.photoCount / PROFILE_GOOD_PHOTO_COUNT, 1),
    presentation: Math.min(p.presentationLength / PROFILE_GOOD_PRESENTATION_LENGTH, 1),
    specialites: p.workTypeCount > 0 ? 1 : 0,
    certifications: p.certificationCount > 0 ? 1 : 0,
  };
  const total = (Object.keys(share) as ProfileTip[]).reduce(
    (sum, tip) => sum + PROFILE_STRENGTH_WEIGHTS[tip] * share[tip],
    0,
  );
  return { percent: Math.floor(total), next: profileTips(p)[0] ?? null };
}
