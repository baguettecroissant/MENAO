"use client";

import { REVIEW_REPLY_MAX_LENGTH } from "@menao/core";
import { useActionState, useId } from "react";
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
  // Plusieurs formulaires sur la page « Mes avis » : identifiants propres à chacun.
  const id = useId();
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label htmlFor={`${id}-reply`} className="text-sm font-medium">
        {t.replyLabel}
      </label>
      <textarea
        id={`${id}-reply`}
        name="reply"
        rows={3}
        maxLength={REVIEW_REPLY_MAX_LENGTH}
        defaultValue={state.values?.reply}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className={`${inputClasses} min-h-24 py-3`}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t.replyHint}
      </p>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <Button type="submit" block={false} disabled={pending} className="self-end">
        {t.replySubmit}
      </Button>
    </form>
  );
}
