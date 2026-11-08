import { reviewFigures, reviewMatches, type ValueForMoney } from "@menao/core";
import { Info } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ScoreBreakdown, formatProfileDay } from "@/components/artisan-profile/profile-view";
import { ReviewSection } from "@/components/pro/review-section";
import { StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { EmptyState } from "@/components/empty-state";
import { ListFilters } from "@/components/list-kit";
import { MoneyFigures } from "@/components/pro/money-figures";
import { sheetCard } from "@/components/pro/sheet";

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
 * Écran « Mes avis » (F-28), refonte « Nette » (ADR 0250) : chiffres clés, avis reçus (tous ou
 * sans réponse) avec réponse et signalement, score MENAO détaillé et fonctionnement des avis.
 */
export function ReviewsScreen({
  reviews,
  score,
  chantierTitles,
  base = "/pro",
  example = false,
  filter = "tous",
}: {
  /** Filtre de la liste (?filtre=sans-reponse, ?filtre=note-basse). */
  filter?: "tous" | "sans-reponse" | "note-basse";
  reviews: ArtisanReviewRow[];
  score: ArtisanScore | null;
  /** Titre de chaque chantier, par identifiant. */
  chantierTitles: Record<string, string>;
  /** Début des liens (pages d'exemples, ADR 0184). */
  base?: string;
  /** Exemple : réponse et signalement inactifs. */
  example?: boolean;
}) {
  // Mêmes règles que l'application (@menao/core : reviewFigures, reviewMatches).
  const coreFilter =
    filter === "sans-reponse" ? "sans_reponse" : filter === "note-basse" ? "note_basse" : "tous";
  const figures = reviewFigures(reviews, score?.global_score ?? null);
  const { toAnswer, published } = figures;
  const shown = reviews.filter((r) => reviewMatches(r, coreFilter));

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-10 sm:px-6">
        <MoneyFigures
          label={t.figuresLabel}
          dense
          cells={[
            {
              label: t.global,
              short: t.globalShort,
              value: score ? fr.review.percent(score.global_score) : "—",
              hint: score ? t.globalHint : t.scoreEmpty,
            },
            { label: t.count, short: t.countShort, value: String(published), hint: t.countHint },
            {
              label: t.unanswered,
              short: t.unansweredShort,
              value: String(toAnswer),
              hint: t.unansweredHint(toAnswer),
              tone: toAnswer > 0 ? "danger" : undefined,
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <section aria-labelledby="liste-avis" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="liste-avis" className="text-xl">
                {t.title}
              </h2>
              <TextLink href={`${base}/profil` as Route} className="text-sm">
                {t.seePublic}
              </TextLink>
            </div>
            {reviews.length > 0 && (
              <ListFilters
                label={t.filtersLabel}
                items={[
                  {
                    href: `${base}/avis`,
                    label: t.filterAll,
                    detail: String(reviews.length),
                    active: filter === "tous",
                  },
                  {
                    href: `${base}/avis?filtre=sans-reponse`,
                    label: t.filterUnanswered,
                    detail: String(toAnswer),
                    tone: toAnswer > 0 ? "warning" : undefined,
                    active: filter === "sans-reponse",
                  },
                  ...(figures.counts.note_basse > 0 || filter === "note-basse"
                    ? [
                        {
                          href: `${base}/avis?filtre=note-basse`,
                          label: t.filterLow,
                          detail: String(figures.counts.note_basse),
                          active: filter === "note-basse",
                        },
                      ]
                    : []),
                ]}
              />
            )}
            {reviews.length === 0 ? (
              <EmptyState illustration="avis">{t.empty}</EmptyState>
            ) : shown.length === 0 ? (
              <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                {filter === "note-basse" ? t.noneLow : t.noneUnanswered}
              </p>
            ) : (
              shown.map((review) => {
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
                    example={example}
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
                              href={`${base}/chantiers/${review.chantier_id}` as Route}
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
            <section aria-labelledby="score-menao" className={sheetCard}>
              <h2 id="score-menao" className="text-lg">
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
            <section aria-labelledby="fonctionnement-avis" className={sheetCard}>
              <h2 id="fonctionnement-avis" className="flex items-center gap-2.5 text-lg">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary-strong">
                  <Info aria-hidden="true" className="size-[1.125rem]" />
                </span>
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
