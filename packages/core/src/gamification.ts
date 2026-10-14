/**
 * Gamification artisan (F-24, maquettes « Mon grade Menao ») : points (XP) gagnés en atteignant
 * des objectifs, niveaux 1 à 5, badges, récompense physique au niveau 5. Les règles sont en base
 * (app.refresh_gamification, valeurs par défaut des maquettes) ; ces fonctions présentent la
 * progression lue par `artisan_grade`. ADR 0091.
 */

/** Tailles de la tenue MENAO (veste et pantalon), maquette « Réclamez votre récompense ». */
export const REWARD_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type RewardSize = (typeof REWARD_SIZES)[number];

export type GradeLevel = {
  level: number;
  xpMin: number;
  reward: string | null;
  rewardDetail: string | null;
};

/**
 * Niveau atteint pour un total de points, niveau suivant et avancement vers lui (0 à 1). Au dernier
 * niveau, `next` est nul et l'avancement vaut 1.
 */
export function levelProgress(
  levels: readonly GradeLevel[],
  xp: number,
): { current: GradeLevel | null; next: GradeLevel | null; progress: number } {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const current = sorted.filter((l) => l.xpMin <= xp).at(-1) ?? null;
  const next = sorted.find((l) => l.xpMin > xp) ?? null;
  if (!next) return { current, next: null, progress: 1 };
  const from = current?.xpMin ?? 0;
  const span = next.xpMin - from;
  return { current, next, progress: span > 0 ? Math.min(1, Math.max(0, (xp - from) / span)) : 0 };
}

/** Prochaine récompense à gagner (« Prochaine récompense de niveau »), au-delà du niveau atteint. */
export function nextReward(levels: readonly GradeLevel[], level: number): GradeLevel | null {
  return (
    [...levels].sort((a, b) => a.level - b.level).find((l) => l.level > level && l.reward) ?? null
  );
}

/** Récompense à réclamer : niveau atteint qui en porte une, pas encore demandée (la plus haute). */
export function claimableReward(
  levels: readonly GradeLevel[],
  level: number,
  claimedLevels: readonly number[],
): GradeLevel | null {
  return (
    [...levels]
      .sort((a, b) => b.level - a.level)
      .find((l) => l.level <= level && l.reward && !claimedLevels.includes(l.level)) ?? null
  );
}
