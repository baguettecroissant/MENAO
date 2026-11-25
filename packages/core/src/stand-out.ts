/**
 * Bloc « Pour vous démarquer » de « Mon inscription » (lot 81, ADR 0391) : quatre atouts
 * facultatifs, chacun avec les points qu'il rapporte au Score MENAO. Les points viennent du
 * barème (`MENAO_SCORE_POINTS`, `experiencePoints`) et de la jauge « Fiche complète »
 * (`PROFILE_STRENGTH_WEIGHTS`) : jamais de chiffre écrit à la main ici.
 */
import { MENAO_SCORE_POINTS, experiencePoints } from "./menao-score";
import { PROFILE_GOOD_PHOTO_COUNT, PROFILE_STRENGTH_WEIGHTS } from "./profile";

export const STAND_OUT_KEYS = ["image", "savoir_faire", "certifications", "realisations"] as const;
export type StandOutKey = (typeof STAND_OUT_KEYS)[number];

export type StandOutFacts = {
  hasAvatar: boolean;
  photoCount: number;
  diploma: boolean;
  /** Années de métier : déclarées ou âge de l'entreprise (`experienceYearsOf`). */
  experienceYears: number | null;
  workTypeCount: number;
  /** Certifications ajoutées (vérifiées ensuite par l'équipe). */
  certificationCount: number;
  /** Qualification RGE trouvée à l'annuaire avec le SIRET. */
  rge: boolean;
};

export type StandOutItem = {
  key: StandOutKey;
  done: boolean;
  /** Points obtenus, points possibles, points encore à gagner (Score MENAO sur 100). */
  earned: number;
  max: number;
  gain: number;
};

/** Points de la jauge « Fiche complète » convertis en points du Score MENAO. */
const profilePoints = (weight: number) => (weight * MENAO_SCORE_POINTS.profil) / 100;
const DIPLOMA_POINTS = MENAO_SCORE_POINTS.diplomes / 2;
const QUALIFICATION_POINTS = MENAO_SCORE_POINTS.diplomes / 2;
const EXPERIENCE_FLOOR = experiencePoints(null);

function item(key: StandOutKey, done: boolean, earned: number, max: number): StandOutItem {
  return { key, done, earned, max, gain: Math.max(0, max - earned) };
}

export function standOut(f: StandOutFacts): {
  items: StandOutItem[];
  earned: number;
  max: number;
  remaining: number;
  doneCount: number;
} {
  const image = profilePoints(PROFILE_STRENGTH_WEIGHTS.photo_profil);
  const photos = profilePoints(PROFILE_STRENGTH_WEIGHTS.realisations);
  const specialites = profilePoints(PROFILE_STRENGTH_WEIGHTS.specialites);
  const certification = profilePoints(PROFILE_STRENGTH_WEIGHTS.certifications);
  const experienceMax = MENAO_SCORE_POINTS.experience - EXPERIENCE_FLOOR;
  const photoShare = Math.min(f.photoCount / PROFILE_GOOD_PHOTO_COUNT, 1);
  const hasCertification = f.certificationCount > 0;

  const items = [
    item("image", f.hasAvatar, f.hasAvatar ? image : 0, image),
    item(
      "savoir_faire",
      f.diploma && f.workTypeCount > 0 && f.experienceYears !== null,
      (f.diploma ? DIPLOMA_POINTS : 0) +
        (f.workTypeCount > 0 ? specialites : 0) +
        (experiencePoints(f.experienceYears) - EXPERIENCE_FLOOR),
      DIPLOMA_POINTS + specialites + experienceMax,
    ),
    item(
      "certifications",
      hasCertification || f.rge,
      (hasCertification || f.rge ? QUALIFICATION_POINTS : 0) +
        (hasCertification ? certification : 0),
      QUALIFICATION_POINTS + certification,
    ),
    item("realisations", photoShare >= 1, photoShare * photos, photos),
  ];
  const earned = items.reduce((sum, i) => sum + i.earned, 0);
  const max = items.reduce((sum, i) => sum + i.max, 0);
  return {
    items,
    earned,
    max,
    remaining: Math.max(0, max - earned),
    doneCount: items.filter((i) => i.done).length,
  };
}

/**
 * Années de métier retenues par le Score MENAO : la plus grande valeur entre les années déclarées
 * et l'âge de l'entreprise (comme `app.artisan_menao_score`). Null si l'on ne sait rien.
 */
export function experienceYearsOf(
  declared: number | null,
  dateCreation: string | null,
  today: string,
): number | null {
  let age: number | null = null;
  if (dateCreation) {
    const [y, m, d] = dateCreation.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    if (y && m && d && ty && tm && td) {
      age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
    }
  }
  if (declared === null && age === null) return null;
  return Math.max(declared ?? 0, age ?? 0);
}

/** Points affichés : arrondis, et jamais « +0 » pour un reste non nul (photos au prorata). */
export function displayPoints(points: number): number {
  if (points <= 0) return 0;
  return Math.max(1, Math.round(points));
}
