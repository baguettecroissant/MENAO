/** Fiche publique de l'artisan (F-10) : conseils pour la rendre plus convaincante. */

/** Une présentation développée et quelques photos rassurent les particuliers. */
export const PROFILE_GOOD_PRESENTATION_LENGTH = 300;
export const PROFILE_GOOD_PHOTO_COUNT = 3;

export type ProfileTip =
  "photo_profil" | "realisations" | "presentation" | "specialites" | "certifications";

/** Conseils encore à suivre, dans l'ordre de leur effet sur les demandes reçues. */
export function profileTips(p: {
  hasAvatar: boolean;
  presentationLength: number;
  photoCount: number;
  workTypeCount: number;
  certificationCount: number;
}): ProfileTip[] {
  const tips: ProfileTip[] = [];
  if (!p.hasAvatar) tips.push("photo_profil");
  if (p.photoCount < PROFILE_GOOD_PHOTO_COUNT) tips.push("realisations");
  if (p.presentationLength < PROFILE_GOOD_PRESENTATION_LENGTH) tips.push("presentation");
  if (p.workTypeCount === 0) tips.push("specialites");
  if (p.certificationCount === 0) tips.push("certifications");
  return tips;
}
