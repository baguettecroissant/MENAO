import { REVIEW_CRITERIA, type ValueForMoney } from "@menao/core";
import type { ReactNode } from "react";
import { ReviewReplyForm } from "@/components/pro/review-reply-form";
import { ReportReview } from "@/components/review/review-list";
import { Stars } from "@/components/review/stars";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.followUp;
const r = fr.review;

export type ChantierReview = {
  id: string;
  score: number;
  quality: number;
  delays: number;
  communication: number;
  /** Propreté du chantier (ADR 0091) : absente des avis plus anciens. */
  cleanliness: number | null;
  value_for_money: ValueForMoney;
  comment: string;
  status: "publie" | "masque";
  moderation_reason: string | null;
  reply: string | null;
};

/**
 * Avis du client sur le chantier, côté artisan (F-28) : notes, commentaire, réponse publique
 * (une seule fois) et signalement à l'équipe MENAO. Sur la page du chantier comme dans
 * « Mes avis » (titre, sous-titre et identifiant propres à chaque avis).
 */
export function ReviewSection({
  review,
  chantierId,
  heading,
  meta,
}: {
  review: ChantierReview;
  chantierId: string;
  heading: string;
  /** Ligne sous le titre (date, chantier, « Sans réponse »). */
  meta?: ReactNode;
}) {
  const headingId = `avis-${review.id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-[1.0625rem] font-medium">
            {heading}
          </h2>
          {meta}
        </div>
        <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
          <Stars score={review.score} />
          {r.percent(review.score)}
        </p>
      </div>
      {review.status === "masque" && review.moderation_reason && (
        <Alert tone="info">{t.reviewHidden(review.moderation_reason)}</Alert>
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {REVIEW_CRITERIA.map((criterion) => {
          const value = review[criterion];
          return (
            value !== null && (
              <div key={criterion} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{r.criteria[criterion]}</dt>
                <dd className="font-medium">{r.percent(value)}</dd>
              </div>
            )
          );
        })}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{r.valueTitle}</dt>
          <dd className="text-right font-medium">{r.values[review.value_for_money]}</dd>
        </div>
      </dl>
      <p className="text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
      {review.reply ? (
        <div className="flex flex-col gap-1 border-l-2 border-primary-soft pl-3">
          <p className="text-xs font-medium text-primary-strong">{t.yourReply}</p>
          <p className="text-sm whitespace-pre-line">{review.reply}</p>
        </div>
      ) : (
        review.status === "publie" && (
          <ReviewReplyForm reviewId={review.id} chantierId={chantierId} />
        )
      )}
      {review.status === "publie" && <ReportReview reviewId={review.id} />}
    </section>
  );
}
