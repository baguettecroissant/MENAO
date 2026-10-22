/**
 * Score MENAO sur 100 (F-10, ADR 0155 ; barème validé par les associés le 22 octobre 2026,
 * d'après « Mettre en avant les nouveaux artisans ») : visible du client et utilisé pour le
 * classement. Il repose sur des critères qu'un nouvel artisan remplit dès le premier jour ; les
 * avis MENAO pèsent de plus en plus avec leur nombre.
 *
 * La base calcule le même score (`app.artisan_menao_score`) : toute modification du barème se
 * fait aux deux endroits, avec les mêmes exemples dans les tests.
 */

/** Points de chaque critère : total 100. */
export const MENAO_SCORE_POINTS = {
  verifie: 20,
  experience: 10,
  diplomes: 10,
  profil: 10,
  reactivite: 10,
  avis: 40,
} as const;
export type MenaoScorePart = keyof typeof MENAO_SCORE_POINTS;
export const MENAO_SCORE_PARTS = Object.keys(MENAO_SCORE_POINTS) as MenaoScorePart[];

/** Diplômes du métier déclarés par l'artisan (le plus élevé). */
export const DIPLOMES_METIER = [
  "cap",
  "bep",
  "bac_pro",
  "bp",
  "bts",
  "brevet_maitrise",
  "titre_pro",
  "autre",
] as const;
export type DiplomeMetier = (typeof DIPLOMES_METIER)[number];

/** Sans aucun avis : l'équivalent d'une note de 3 sur 5 (24 points sur 40). */
export const REVIEW_WELCOME_RATING = 3;
/** Avis MENAO à partir desquels ils pèsent autant que la base : poids n / (n + 5). */
export const REVIEW_MENAO_PRIOR = 5;
/** Sans réponse ni devis mesurés : valeurs neutres (7 sur 10, 70 % de devis à temps). */
export const NEUTRAL_RESPONSE_POINTS = 7;
export const NEUTRAL_QUOTE_RATE = 70;

export type MenaoScoreInput = {
  /** Badge « Assuré et vérifié » (ADR 0119). */
  verified: boolean;
  /** Plus grande valeur entre les années déclarées et l'âge de l'entreprise (Sirene). */
  experienceYears: number | null;
  diploma: boolean;
  /** Qualification vérifiée (RGE, Qualibat, Qualifelec…) ou domaine RGE de l'annuaire. */
  qualification: boolean;
  /** Jauge « Fiche complète » (`profileStrength`). */
  profilePercent: number;
  /** Temps de réponse moyen aux demandes, publié à partir de 3 réponses. */
  responseMinutes: number | null;
  /** Part des devis envoyés sous 72 h, lissée (0 à 100). */
  quoteOnTimeRate: number | null;
  google: { rating: number; count: number } | null;
  menao: { rating: number; count: number } | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Moins de 2 ans : 3 · 2 à 4 ans : 6 · 5 à 9 ans : 8 · 10 ans et plus : 10. */
export function experiencePoints(years: number | null): number {
  const y = years ?? 0;
  if (y >= 10) return 10;
  if (y >= 5) return 8;
  if (y >= 2) return 6;
  return 3;
}

/** Moins de 2 h : 10 · moins de 12 h : 8 · moins de 24 h : 6 · moins de 72 h : 3. */
export function responsePoints(minutes: number | null): number {
  if (minutes === null) return NEUTRAL_RESPONSE_POINTS;
  if (minutes < 120) return 10;
  if (minutes < 720) return 8;
  if (minutes < 1440) return 6;
  if (minutes < 4320) return 3;
  return 0;
}

/**
 * Avis sur 40 : la note Google sert de base (sinon 3 sur 5) ; la moyenne des avis MENAO s'y
 * mêle avec un poids n / (n + 5) : la moitié à 5 avis, 80 % à 20 avis.
 */
export function reviewsPoints(
  google: { rating: number; count: number } | null,
  menao: { rating: number; count: number } | null,
): number {
  const base = google ? clamp(google.rating, 1, 5) : REVIEW_WELCOME_RATING;
  const n = menao ? Math.max(0, menao.count) : 0;
  const weight = n / (n + REVIEW_MENAO_PRIOR);
  const rating = menao && n > 0 ? weight * clamp(menao.rating, 1, 5) + (1 - weight) * base : base;
  return (rating / 5) * MENAO_SCORE_POINTS.avis;
}

/** Score total (arrondi) et points de chaque critère. */
export function menaoScore(input: MenaoScoreInput): {
  total: number;
  parts: Record<MenaoScorePart, number>;
} {
  const quoteRate = clamp(input.quoteOnTimeRate ?? NEUTRAL_QUOTE_RATE, 0, 100);
  const parts: Record<MenaoScorePart, number> = {
    verifie: input.verified ? MENAO_SCORE_POINTS.verifie : 0,
    experience: experiencePoints(input.experienceYears),
    diplomes: (input.diploma ? 5 : 0) + (input.qualification ? 5 : 0),
    profil: clamp(Math.floor(input.profilePercent), 0, 100) / 10,
    reactivite: (responsePoints(input.responseMinutes) + quoteRate / 10) / 2,
    avis: reviewsPoints(input.google, input.menao),
  };
  const total = Math.round(MENAO_SCORE_PARTS.reduce((sum, key) => sum + parts[key], 0));
  return { total, parts };
}

export type MenaoScoreTip = {
  key: "verifie" | "diplome" | "qualification" | "profil";
  points: number;
};

/**
 * Conseils à l'artisan : ce qui lui rapporterait des points tout de suite, le plus rentable
 * d'abord (les avis et la réactivité viennent avec les chantiers).
 */
export function menaoScoreTips(
  parts: Record<MenaoScorePart, number>,
  facts: { verified: boolean; diploma: boolean; qualification: boolean },
): MenaoScoreTip[] {
  const tips: MenaoScoreTip[] = [];
  if (!facts.verified) tips.push({ key: "verifie", points: MENAO_SCORE_POINTS.verifie });
  if (!facts.diploma) tips.push({ key: "diplome", points: 5 });
  if (!facts.qualification) tips.push({ key: "qualification", points: 5 });
  const profile = Math.round(MENAO_SCORE_POINTS.profil - parts.profil);
  if (profile > 0) tips.push({ key: "profil", points: profile });
  return tips.sort((a, b) => b.points - a.points);
}
