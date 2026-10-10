import { REVIEW_CRITERIA, type ValueForMoney } from "@menao/core";
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
  value_for_money: ValueForMoney;
  comment: string;
  status: "publie" | "masque";
  moderation_reason: string | null;
  reply: string | null;
};

/**
 * Avis du client sur le chantier, côté artisan (F-28) : notes, commentaire, réponse publique
 * (une seule fois) et signalement à l'équipe MENAO.
 */
export function ReviewSection({
  review,
  chantierId,
  clientFirstName,
}: {
  review: ChantierReview;
  chantierId: string;
  clientFirstName: string;
}) {
  return (
    <section
      aria-labelledby="review-title"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="review-title" className="text-[1.0625rem] font-medium">
          {t.reviewTitle(clientFirstName)}
        </h2>
        <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
          <Stars score={review.score} />
          {r.percent(review.score)}
        </p>
      </div>
      {review.status === "masque" && review.moderation_reason && (
        <Alert tone="info">{t.reviewHidden(review.moderation_reason)}</Alert>
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {REVIEW_CRITERIA.map((criterion) => (
          <div key={criterion} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{r.criteria[criterion]}</dt>
            <dd className="font-medium">{r.percent(review[criterion])}</dd>
          </div>
        ))}
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
