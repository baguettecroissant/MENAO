"use client";

import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { cancelAppointment } from "@/lib/commercial/prospect-actions";

const t = fr.commercialProspects.day.camille;

/** Annuler un rendez-vous pris par Camille (ADR 0226), avec une confirmation en deux temps. */
export function CancelAppointmentForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelAppointment, initialFormState);
  const [confirming, setConfirming] = useState(false);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {confirming ? (
        <>
          <Button type="submit" variant="danger-text" size="sm" block={false} disabled={pending}>
            {t.cancelConfirm}
          </Button>
          <p className="text-xs text-muted-foreground">{t.cancelHint}</p>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          block={false}
          onClick={() => setConfirming(true)}
        >
          {t.cancel}
        </Button>
      )}
    </form>
  );
}
