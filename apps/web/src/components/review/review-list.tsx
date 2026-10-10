"use client";

import { BadgeCheck, Flag } from "lucide-react";
import { useActionState, useState } from "react";
import { Stars } from "@/components/review/stars";
import { Alert, Button, FieldError, TextLink, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { reportReview } from "@/lib/reviews/actions";

const t = fr.search.profile;
/** Avis affichés avant « Afficher les N avis » (maquette « Fiche artisan »). */
const VISIBLE = 3;

export type PublicReview = {
  id: string;
  author: string;
  /** Date de publication, déjà formatée. */
  publishedOn: string;
  /** Date de réception du chantier (date de l'expérience), déjà formatée. */
  receivedOn: string;
  score: number;
  comment: string;
  reply: string | null;
};

/**
 * Derniers avis clients (F-10, F-28) : du plus récent au plus ancien, mention « Avis vérifié »,
 * date de publication et date de l'expérience, réponse de l'artisan. Signalement depuis un compte
 * connecté ; sinon par la page Contact.
 */
export function ReviewList({
  reviews,
  artisanName,
  canReport,
}: {
  reviews: PublicReview[];
  artisanName: string;
  canReport: boolean;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? reviews : reviews.slice(0, VISIBLE);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border">
        {shown.map((review) => (
          <li key={review.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium">{review.author}</span>
                <span className="text-xs text-muted-foreground">· {review.publishedOn}</span>
                <Stars score={review.score} />
              </p>
              <span className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                <BadgeCheck aria-hidden="true" className="size-3.5" />
                {t.verified}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {review.comment}
            </p>
            <p className="text-xs text-muted-foreground">{t.receivedOn(review.receivedOn)}</p>
            {review.reply && (
              <div className="ml-1 flex flex-col gap-1 border-l-2 border-primary-soft pl-3">
                <p className="text-xs font-medium text-primary-strong">
                  {t.replyFrom(artisanName)}
                </p>
                <p className="text-sm whitespace-pre-line text-foreground/90">{review.reply}</p>
              </div>
            )}
            {canReport && <ReportReview reviewId={review.id} />}
          </li>
        ))}
      </ul>
      {reviews.length > VISIBLE && !all && (
        <Button
          type="button"
          variant="secondary"
          block={false}
          className="self-start"
          onClick={() => setAll(true)}
        >
          {t.showAllReviews(reviews.length)}
        </Button>
      )}
      {!canReport && (
        <TextLink href="/contact" className="self-start text-xs">
          {t.reportSignIn}
        </TextLink>
      )}
    </div>
  );
}

/** « Signaler cet avis » : motif transmis à l'équipe MENAO (ticket « Avis signalé »). */
export function ReportReview({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportReview.bind(null, reviewId),
    initialFormState,
  );
  const id = `report-${reviewId}`;
  const error = state.fieldErrors?.reason?.[0];

  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-touch items-center gap-1.5 self-start rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <Flag aria-hidden="true" className="size-3.5" />
        {t.report}
      </button>
    );
  }
  return (
    <form
      action={formAction}
      noValidate
      aria-label={t.reportTitle}
      className="flex flex-col gap-2 rounded-input bg-background p-3"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label htmlFor={id} className="text-sm font-medium">
        {t.reportLabel}
      </label>
      <textarea
        id={id}
        name="reason"
        rows={3}
        maxLength={1000}
        defaultValue={state.values?.reason}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className={`${inputClasses} min-h-20 py-2`}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t.reportHint}
      </p>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" block={false} onClick={() => setOpen(false)}>
          {t.reportCancel}
        </Button>
        <Button type="submit" block={false} disabled={pending}>
          {t.reportSubmit}
        </Button>
      </div>
    </form>
  );
}
