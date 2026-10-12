"use client";

import { CLIENT_CANCEL_REASONS } from "@menao/core";
import { useActionState, useCallback, useId, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { cancelChantier, cancelRequest } from "@/lib/project/space-actions";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.clientCancel;

type Labels = { open: string; openLabel?: string; title: string; intro: string; submit: string };

/** Annulation par le client (F-11, F-12) : motif de la liste et mot facultatif, dans un tiroir. */
function CancelDrawerButton({
  action,
  labels,
  compact,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  labels: Labels;
  /** Lien discret aligné à gauche (liste des demandes), sinon centré sous le chantier. */
  compact?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(action, initialFormState);
  useActionSuccess(state, close);
  const reasonError = state.fieldErrors?.reason?.[0];
  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={labels.openLabel}
          className="min-h-touch self-start text-xs font-medium text-danger underline-offset-2 hover:underline"
        >
          {labels.open}
        </button>
      ) : (
        // Même présentation que « Signaler un problème lié au chantier », juste au-dessus.
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={labels.openLabel}
          className="self-center rounded-md px-2 py-1 text-sm font-medium text-danger hover:underline focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none"
        >
          {labels.open}
        </button>
      )}
      <Drawer open={open} onClose={close} title={labels.title} backLabel={t.back}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{labels.intro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={reasonError ? `${id}-reason-error` : undefined}
          >
            <legend className="mb-1 text-sm font-medium">{t.reasonsLegend}</legend>
            {CLIENT_CANCEL_REASONS.map((reason) => (
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
                {t.reasons[reason]}
              </label>
            ))}
            {reasonError && <FieldError id={`${id}-reason-error`}>{reasonError}</FieldError>}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-comment`} className="text-sm font-medium">
              {t.comment} <span className="font-normal text-subtle-foreground">{t.optional}</span>
            </label>
            <textarea
              id={`${id}-comment`}
              name="comment"
              rows={3}
              maxLength={500}
              defaultValue={state.values?.comment}
              className={`${inputClasses} min-h-24 py-3`}
            />
          </div>
          <Button type="submit" variant="danger" size="lg" disabled={pending}>
            {labels.submit}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

/** « Annuler ma demande » : demande encore sans réponse de l'artisan. */
export function CancelRequestButton({
  requestId,
  artisanName,
}: {
  requestId: string;
  artisanName: string;
}) {
  return (
    <CancelDrawerButton
      compact
      action={cancelRequest.bind(null, requestId)}
      labels={{
        open: t.request.open,
        openLabel: t.request.openLabel(artisanName),
        title: t.request.title,
        intro: t.request.intro(artisanName),
        submit: t.request.submit,
      }}
    />
  );
}

/** « Annuler le chantier » : avant tout devis signé et tout acompte. */
export function CancelChantierButton({
  chantierId,
  artisanName,
}: {
  chantierId: string;
  artisanName: string;
}) {
  return (
    <CancelDrawerButton
      action={cancelChantier.bind(null, chantierId)}
      labels={{
        open: t.chantier.open,
        title: t.chantier.title,
        intro: t.chantier.intro(artisanName),
        submit: t.chantier.submit,
      }}
    />
  );
}
