"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { moderateReview } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.tickets.review;

/** F-28, F-55 : masquer un avis signalé (motif obligatoire) ou le republier. */
export function ModerateReview({
  reviewId,
  status,
}: {
  reviewId: string;
  status: "publie" | "masque";
}) {
  const [state, formAction, pending] = useActionState(moderateReview, initialFormState);
  const id = `moderation-${reviewId}`;
  const error = state.fieldErrors?.reason?.[0];
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value={status === "publie" ? "masque" : "publie"} />
      {status === "publie" && (
        <>
          <label htmlFor={id} className="text-sm font-medium">
            {t.reasonLabel}
          </label>
          <textarea
            id={id}
            name="reason"
            rows={2}
            maxLength={500}
            defaultValue={state.values?.reason}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-rule${error ? ` ${id}-error` : ""}`}
            className={`${inputClasses} min-h-16 py-2`}
          />
          <p id={`${id}-rule`} className="text-xs text-muted-foreground">
            {t.rule}
          </p>
          {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </>
      )}
      <Button
        type="submit"
        variant={status === "publie" ? "danger" : "secondary"}
        block={false}
        disabled={pending}
        className="self-start"
      >
        {status === "publie" ? t.hide : t.republish}
      </Button>
    </form>
  );
}
