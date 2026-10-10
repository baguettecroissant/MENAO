"use client";

import { QUOTE_REFUSAL_REASONS } from "@menao/core";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { refuseQuote, requestQuoteRevision } from "@/lib/project/quote-actions";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.clientQuote;

/** Réponse du client au devis (F-21) : demander une modification ou refuser, dans un tiroir. */
export function QuoteResponse({ quoteId }: { quoteId: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <RevisionButton quoteId={quoteId} />
      <RefusalButton quoteId={quoteId} />
    </div>
  );
}

function RevisionButton({ quoteId }: { quoteId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(
    requestQuoteRevision.bind(null, quoteId),
    initialFormState,
  );
  useActionSuccess(state, close);
  const error = state.fieldErrors?.message?.[0];
  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => setOpen(true)}>
        {t.requestChange}
      </Button>
      <Drawer open={open} onClose={close} title={t.revision.title} backLabel={t.backToQuote}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.revision.intro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="revision-message" className="text-sm font-medium">
              {t.revision.label}
            </label>
            <textarea
              id="revision-message"
              name="message"
              rows={5}
              maxLength={1000}
              defaultValue={state.values?.message}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "revision-message-error" : undefined}
              className={`${inputClasses} min-h-32 py-3`}
            />
            {error && <FieldError id="revision-message-error">{error}</FieldError>}
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {t.revision.submit}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

function RefusalButton({ quoteId }: { quoteId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(
    refuseQuote.bind(null, quoteId),
    initialFormState,
  );
  useActionSuccess(state, close);
  const reasonError = state.fieldErrors?.reason?.[0];
  return (
    <>
      <Button type="button" variant="danger-text" size="lg" onClick={() => setOpen(true)}>
        {t.refuse}
      </Button>
      <Drawer open={open} onClose={close} title={t.refusal.title} backLabel={t.backToQuote}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.refusal.intro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={reasonError ? "refusal-reason-error" : undefined}
          >
            <legend className="mb-1 text-sm font-medium">{t.refusal.reason}</legend>
            {QUOTE_REFUSAL_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input border border-border bg-surface px-4 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-softer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  defaultChecked={state.values?.reason === reason}
                  className="size-4 accent-primary"
                />
                {t.refusal.reasons[reason]}
              </label>
            ))}
            {reasonError && <FieldError id="refusal-reason-error">{reasonError}</FieldError>}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refusal-comment" className="text-sm font-medium">
              {t.refusal.comment}{" "}
              <span className="font-normal text-subtle-foreground">{t.refusal.optional}</span>
            </label>
            <textarea
              id="refusal-comment"
              name="comment"
              rows={3}
              maxLength={500}
              defaultValue={state.values?.comment}
              className={`${inputClasses} min-h-24 py-3`}
            />
          </div>
          <Button type="submit" variant="danger" size="lg" disabled={pending}>
            {t.refusal.submit}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
