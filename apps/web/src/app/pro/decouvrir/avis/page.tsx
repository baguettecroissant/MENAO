import { exampleReviews, exampleScore } from "@menao/core";
import type { Metadata } from "next";
import { ReviewsScreen } from "@/components/pro/reviews-screen";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.reviews.title} — MENAO` };

/** Avis d'exemple (ADR 0184) : score MENAO, un avis sans réponse, deux avec réponse. */
export default async function ExampleReviewsPage() {
  await requireExampleViewer();
  return (
    <ReviewsScreen
      reviews={exampleReviews()}
      score={exampleScore()}
      chantierTitles={{}}
      base={EXAMPLES_BASE}
      example
    />
  );
}
