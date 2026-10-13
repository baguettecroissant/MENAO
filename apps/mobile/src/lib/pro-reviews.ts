import type { ValueForMoney } from "@menao/core";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/** Avis d'un client sur un chantier de l'artisan (F-28), publié ou masqué par l'équipe. */
export type ArtisanReview = {
  id: string;
  chantierId: string;
  authorName: string;
  score: number;
  quality: number;
  delays: number;
  communication: number;
  valueForMoney: ValueForMoney;
  comment: string;
  experienceOn: string;
  status: "publie" | "masque";
  moderationReason: string | null;
  reply: string | null;
  createdAt: string;
};

export const REVIEW_COLUMNS =
  "id, chantier_id, author_name, score, quality, delays, communication, value_for_money, comment, experience_on, status, moderation_reason, reply, created_at";

type ReviewRow = {
  id: string;
  chantier_id: string;
  author_name: string;
  score: number;
  quality: number;
  delays: number;
  communication: number;
  value_for_money: ValueForMoney;
  comment: string;
  experience_on: string;
  status: "publie" | "masque";
  moderation_reason: string | null;
  reply: string | null;
  created_at: string;
};

export const toArtisanReview = (r: ReviewRow): ArtisanReview => ({
  id: r.id,
  chantierId: r.chantier_id,
  authorName: r.author_name,
  score: r.score,
  quality: r.quality,
  delays: r.delays,
  communication: r.communication,
  valueForMoney: r.value_for_money,
  comment: r.comment,
  experienceOn: r.experience_on,
  status: r.status,
  moderationReason: r.moderation_reason,
  reply: r.reply,
  createdAt: r.created_at,
});

/** Score MENAO détaillé (moyennes des avis publiés), comme sur la fiche publique. */
export type ArtisanScore = {
  review_count: number;
  quality: number;
  delays: number;
  communication: number;
  value_for_money: number;
  global: number;
};

export type MyReviews = {
  reviews: ArtisanReview[];
  score: ArtisanScore | null;
  /** Titre de chaque chantier, par identifiant. */
  chantierTitles: Map<string, string>;
};

/** Identifiant artisan du compte connecté (les avis sont filtrés dessus, comme sur le site). */
async function myArtisanId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase.from("artisans").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/**
 * « Mes avis » (F-28), comme sur le site : tous les avis reçus (publiés ou masqués par l'équipe),
 * du plus récent au plus ancien, score MENAO détaillé et titres des chantiers. Null en cas d'erreur.
 */
export async function loadMyReviews(): Promise<MyReviews | null> {
  const artisanId = await myArtisanId();
  if (!artisanId) return null;
  const [{ data: rows, error }, { data: score }, { data: chantiers }] = await Promise.all([
    supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false }),
    supabase
      .from("artisan_scores")
      .select("review_count, quality, delays, communication, value_for_money, global_score")
      .eq("artisan_id", artisanId)
      .maybeSingle(),
    supabase.rpc("artisan_chantiers"),
  ]);
  if (error) return null;
  return {
    reviews: (rows ?? []).map(toArtisanReview),
    score: score
      ? {
          review_count: score.review_count,
          quality: score.quality,
          delays: score.delays,
          communication: score.communication,
          value_for_money: score.value_for_money,
          global: score.global_score,
        }
      : null,
    chantierTitles: new Map((chantiers ?? []).map((c) => [c.chantier_id, c.title])),
  };
}

/** Nombre d'avis publiés sans réponse de l'artisan (tableau de bord, comme le menu du site). */
export async function countReviewsToAnswer(): Promise<number> {
  const artisanId = await myArtisanId();
  if (!artisanId) return 0;
  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("artisan_id", artisanId)
    .eq("status", "publie")
    .is("reply", null);
  return count ?? 0;
}

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const reviewError = (error: { code?: string; message: string }) =>
  error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;

/** F-28 : réponse publique de l'artisan, une seule fois (artisan_reply_review). */
export async function replyToReview(reviewId: string, reply: string): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_reply_review", {
    p_review_id: reviewId,
    p_reply: reply,
  });
  return error ? reviewError(error) : null;
}

/** F-28 : signalement d'un avis à l'équipe MENAO (ticket « avis »). */
export async function reportReview(reviewId: string, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc("report_review", {
    p_review_id: reviewId,
    p_reason: reason,
  });
  return error ? reviewError(error) : null;
}
