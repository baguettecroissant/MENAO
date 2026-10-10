"use client";

import { DISPUTE_OUTCOMES } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { closeDispute } from "@/lib/disputes/actions";

const t = fr.admin.tickets.dispute;

/** F-42 : décision de l'équipe sur un litige, reprise ou annulation du chantier, expliquée. */
export function DisputeDecision({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(
    closeDispute.bind(null, ticketId),
    initialFormState,
  );
  const id = `decision-${ticketId}`;
  const outcomeError = state.fieldErrors?.outcome?.[0];
  const messageError = state.fieldErrors?.message?.[0];
  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-2 border-t border-border pt-3"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="pb-1 text-sm font-medium">{t.decisionLegend}</legend>
        {DISPUTE_OUTCOMES.map((outcome) => (
          <label key={outcome} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              value={outcome}
              defaultChecked={state.values?.outcome === outcome}
              className="size-4 accent-primary"
            />
            {t.outcomes[outcome]}
          </label>
        ))}
        {outcomeError && <FieldError>{outcomeError}</FieldError>}
      </fieldset>
      <label htmlFor={id} className="text-sm font-medium">
        {t.decisionLabel}
      </label>
      <textarea
        id={id}
        name="message"
        rows={3}
        maxLength={2000}
        defaultValue={state.values?.message}
        aria-invalid={messageError ? true : undefined}
        aria-describedby={messageError ? `${id}-error` : undefined}
        className={`${inputClasses} min-h-20 py-2`}
      />
      {messageError && <FieldError id={`${id}-error`}>{messageError}</FieldError>}
      <Button
        type="submit"
        variant="danger"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {t.decide}
      </Button>
    </form>
  );
}
