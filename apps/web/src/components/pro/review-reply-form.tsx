"use client";

import { REVIEW_REPLY_MAX_LENGTH } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { replyToReview } from "@/lib/reviews/actions";

const t = fr.pro.followUp;

/** F-28 : réponse publique de l'artisan à l'avis de son client, une seule fois. */
export function ReviewReplyForm({
  reviewId,
  chantierId,
}: {
  reviewId: string;
  chantierId: string;
}) {
  const [state, formAction, pending] = useActionState(
    replyToReview.bind(null, reviewId, chantierId),
    initialFormState,
  );
  const error = state.fieldErrors?.reply?.[0];
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label htmlFor="review-reply" className="text-sm font-medium">
        {t.replyLabel}
      </label>
      <textarea
        id="review-reply"
        name="reply"
        rows={3}
        maxLength={REVIEW_REPLY_MAX_LENGTH}
        defaultValue={state.values?.reply}
        aria-invalid={error ? true : undefined}
        aria-describedby={`review-reply-hint${error ? " review-reply-error" : ""}`}
        className={`${inputClasses} min-h-24 py-3`}
      />
      <p id="review-reply-hint" className="text-xs text-muted-foreground">
        {t.replyHint}
      </p>
      {error && <FieldError id="review-reply-error">{error}</FieldError>}
      <Button type="submit" block={false} disabled={pending} className="self-end">
        {t.replySubmit}
      </Button>
    </form>
  );
}
