"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxField, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { radiateArtisan } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.radiation;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

/**
 * Radiation d'un artisan (ADR 0114) : exclusion définitive, motif transmis à l'artisan,
 * confirmation explicite. Une fois radié, seul le rappel de la décision s'affiche.
 */
export function RadiationForm({
  artisanId,
  radiatedAt,
  reason,
}: {
  artisanId: string;
  radiatedAt: string | null;
  reason: string | null;
}) {
  const [state, action, pending] = useActionState(radiateArtisan, initialFormState);
  if (radiatedAt) {
    return <Alert tone="error">{t.radiated(day.format(new Date(radiatedAt)), reason)}</Alert>;
  }
  const reasonError = state.fieldErrors?.reason?.[0];
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="artisanId" value={artisanId} />
      <label htmlFor="radiation-reason" className="text-sm font-medium">
        {t.reasonLabel}
      </label>
      <textarea
        id="radiation-reason"
        name="reason"
        rows={3}
        maxLength={1000}
        defaultValue={state.values?.reason}
        aria-invalid={reasonError ? true : undefined}
        aria-describedby={reasonError ? "radiation-error" : undefined}
        className={`${inputClasses} min-h-20 py-2`}
      />
      {reasonError && <FieldError id="radiation-error">{reasonError}</FieldError>}
      <CheckboxField name="confirm" id="radiation-confirm" errors={state.fieldErrors?.confirm}>
        {t.confirm}
      </CheckboxField>
      <Button
        type="submit"
        variant="danger"
        size="sm"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {t.submit}
      </Button>
    </form>
  );
}
