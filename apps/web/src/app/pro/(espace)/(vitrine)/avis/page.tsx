import type { Metadata } from "next";
import { ReviewsScreen } from "@/components/pro/reviews-screen";
import { fr } from "@/i18n/fr";
import { artisanActivity, requireProSpace } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.reviews.title} — MENAO` };

/**
 * « Mes avis » (F-28) : score MENAO détaillé, tous les avis reçus (publiés ou masqués par
 * l'équipe), réponse publique et signalement, du plus récent au plus ancien.
 */
export default async function MyReviewsPage() {
  const space = await requireProSpace();
  const { supabase } = space;
  const [{ data: rows }, { data: score }, { chantiers }] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, chantier_id, author_name, score, quality, delays, communication, cleanliness, value_for_money, comment, experience_on, status, moderation_reason, reply, created_at",
      )
      .eq("artisan_id", space.artisanId)
      .order("created_at", { ascending: false }),
    supabase
      .from("artisan_scores")
      .select("review_count, quality, delays, communication, value_for_money, global_score")
      .eq("artisan_id", space.artisanId)
      .maybeSingle(),
    artisanActivity(),
  ]);
  return (
    <ReviewsScreen
      reviews={rows ?? []}
      score={score}
      chantierTitles={Object.fromEntries(chantiers.map((c) => [c.chantier_id, c.title]))}
    />
  );
}
