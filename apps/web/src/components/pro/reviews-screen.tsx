import type { ValueForMoney } from "@menao/core";
import { Info } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ScoreBreakdown, formatProfileDay } from "@/components/artisan-profile/profile-view";
import { ReviewSection } from "@/components/pro/review-section";
import { StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { EmptyState } from "@/components/empty-state";

const t = fr.pro.reviews;
const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export type ArtisanReviewRow = {
  id: string;
  chantier_id: string;
  author_name: string;
  score: number;
  quality: number;
  delays: number;
  communication: number;
  cleanliness: number | null;
  value_for_money: string;
  comment: string;
  experience_on: string;
  status: "publie" | "masque";
  moderation_reason: string | null;
  reply: string | null;
  created_at: string;
};
export type ArtisanScore = {
  review_count: number;
  quality: number;
  delays: number;
  communication: number;
  value_for_money: number;
  global_score: number;
};

/**
 * Écran « Mes avis » (F-28) : avis reçus avec réponse et signalement, score MENAO détaillé,
 * nombre d'avis sans réponse et fonctionnement des avis.
 */
export function ReviewsScreen({
  reviews,
  score,
  chantierTitles,
}: {
  reviews: ArtisanReviewRow[];
  score: ArtisanScore | null;
  /** Titre de chaque chantier, par identifiant. */
  chantierTitles: Record<string, string>;
}) {
  const toAnswer = reviews.filter((r) => r.status === "publie" && r.reply === null).length;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <TextLink href="/pro/profil" className="text-sm">
            {t.seePublic}
          </TextLink>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section aria-labelledby="liste-avis" className="flex min-w-0 flex-col gap-4">
            <h2 id="liste-avis" className="sr-only">
              {t.listTitle}
            </h2>
            {/* Mobile : le score détaillé arrive après la liste ; résumé en tête. */}
            {reviews.length > 0 && (
              <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card border border-border bg-surface px-4 py-3 text-sm shadow-card lg:hidden">
                {score && (
                  <span className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">{t.scoreTitle}</span>
                    <span className="text-lg font-medium text-primary-strong">
                      {fr.review.percent(score.global_score)}
                    </span>
                  </span>
                )}
                <span className={toAnswer > 0 ? "font-medium text-warning" : "text-success"}>
                  {t.toAnswer(toAnswer)}
                </span>
              </p>
            )}
            {reviews.length === 0 ? (
              <EmptyState illustration="avis">{t.empty}</EmptyState>
            ) : (
              reviews.map((review) => {
                const title = chantierTitles[review.chantier_id];
                return (
                  <ReviewSection
                    key={review.id}
                    review={{
                      ...review,
                      value_for_money: review.value_for_money as ValueForMoney,
                    }}
                    chantierId={review.chantier_id}
                    heading={review.author_name}
                    meta={
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {t.publishedOn(publishedFormat.format(new Date(review.created_at)))}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {fr.search.profile.receivedOn(formatProfileDay(review.experience_on))}
                        </span>
                        {title && (
                          <>
                            <span aria-hidden="true">·</span>
                            <Link
                              href={`/pro/chantiers/${review.chantier_id}` as Route}
                              className="font-medium text-primary-strong underline-offset-2 hover:underline"
                            >
                              {t.chantier(title)}
                            </Link>
                          </>
                        )}
                        {review.status === "masque" ? (
                          <StatusBadge tone="neutral">{t.hidden}</StatusBadge>
                        ) : (
                          review.reply === null && (
                            <StatusBadge tone="warning">{t.noReply}</StatusBadge>
                          )
                        )}
                      </p>
                    }
                  />
                );
              })
            )}
          </section>

          <aside className="flex flex-col gap-5">
            <section
              aria-labelledby="score-menao"
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
            >
              <h2 id="score-menao" className="text-[1.0625rem] font-medium">
                {t.scoreTitle}
              </h2>
              {score ? (
                <ScoreBreakdown
                  score={{
                    review_count: score.review_count,
                    quality: score.quality,
                    delays: score.delays,
                    communication: score.communication,
                    value_for_money: score.value_for_money,
                    global: score.global_score,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t.scoreEmpty}</p>
              )}
              {reviews.length > 0 && (
                <p
                  className={`rounded-input px-3 py-2 text-xs font-medium ${
                    toAnswer > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
                  }`}
                >
                  {t.toAnswer(toAnswer)}
                </p>
              )}
            </section>
            <section
              aria-labelledby="fonctionnement-avis"
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
            >
              <h2
                id="fonctionnement-avis"
                className="flex items-center gap-2 text-[1.0625rem] font-medium"
              >
                <Info aria-hidden="true" className="size-[1.125rem] text-primary" />
                {t.howTitle}
              </h2>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-foreground/85 marker:text-primary/60">
                {t.how.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
