"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reviewHeldRequests } from "@/lib/admin/ticket-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.tickets.heldRequests;

/** Demandes retenues (ADR 0157) : les transmettre aux artisans ou les bloquer, motif obligatoire. */
export function HeldRequestsDecision({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(reviewHeldRequests, initialFormState);
  const error = state.fieldErrors?.reason?.[0];
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="held-reason" className="text-sm font-medium">
          {t.reasonLabel}
        </label>
        <textarea
          id="held-reason"
          name="reason"
          rows={2}
          maxLength={500}
          defaultValue={state.values?.reason}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "held-reason-error" : undefined}
          className={`${inputClasses} min-h-16 py-2`}
        />
        {error && <FieldError id="held-reason-error">{error}</FieldError>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="release" block={false} disabled={pending}>
          {t.release}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="block"
          variant="danger"
          block={false}
          disabled={pending}
        >
          {t.block}
        </Button>
      </div>
    </form>
  );
}
