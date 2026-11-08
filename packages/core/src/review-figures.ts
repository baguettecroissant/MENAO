import { reviewStars } from "./review";

/**
 * Avis « note plus basse » (refonte « Nette », lot 5) : 4 étoiles ou moins, à l'étoile la plus
 * proche comme sur les cartes (`reviewStars`), soit un score sous 90 sur 100.
 */
export const LOW_REVIEW_MAX_STARS = 4;

export function isLowReview(score: number): boolean {
  return reviewStars(score) <= LOW_REVIEW_MAX_STARS;
}

type ReviewLike = { status: "publie" | "masque"; reply: string | null; score: number };

/** Avis publié qui attend la réponse de l'artisan (un avis masqué n'en attend pas). */
export function reviewAwaitsReply(r: Pick<ReviewLike, "status" | "reply">): boolean {
  return r.status === "publie" && r.reply === null;
}

export type ReviewFilter = "tous" | "sans_reponse" | "note_basse";

/** Avis retenus par un filtre de la liste « Avis » de l'artisan. */
export function reviewMatches(r: ReviewLike, filter: ReviewFilter): boolean {
  if (filter === "sans_reponse") return reviewAwaitsReply(r);
  if (filter === "note_basse") return isLowReview(r.score);
  return true;
}

/**
 * Chiffres de la rubrique « Avis » de l'artisan (refonte « Nette », lot 5) : note globale (score
 * MENAO sur 100, arrondi, null avant le premier avis publié), avis publiés, avis sans réponse, et
 * le nombre d'avis de chaque filtre.
 */
export function reviewFigures(
  reviews: readonly ReviewLike[],
  globalScore: number | null,
): {
  rating: number | null;
  published: number;
  toAnswer: number;
  counts: Record<ReviewFilter, number>;
} {
  const toAnswer = reviews.filter(reviewAwaitsReply).length;
  return {
    rating: globalScore === null ? null : Math.round(globalScore),
    published: reviews.filter((r) => r.status === "publie").length,
    toAnswer,
    counts: {
      tous: reviews.length,
      sans_reponse: toAnswer,
      note_basse: reviews.filter((r) => isLowReview(r.score)).length,
    },
  };
}
