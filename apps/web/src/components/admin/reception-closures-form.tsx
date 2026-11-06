"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxField, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveReceptionClosures } from "@/lib/admin/reception-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatDateNumeric } from "@/lib/format";

const t = fr.admin.tickets.reception;

/** Fermetures exceptionnelles et jours fériés de l'accueil (ADR 0230). */
export function ReceptionClosuresForm({
  closedDates,
  holidaysClosed,
}: {
  closedDates: string[];
  holidaysClosed: boolean;
}) {
  const [state, action, pending] = useActionState(saveReceptionClosures, initialFormState);
  const error = state.fieldErrors?.fermetures?.[0];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fermetures" className="text-sm font-medium text-foreground">
          {t.closures}
        </label>
        <textarea
          id="fermetures"
          name="fermetures"
          rows={4}
          maxLength={3000}
          defaultValue={
            state.values?.fermetures ??
            closedDates.map((d) => formatDateNumeric(`${d}T12:00:00Z`)).join("\n")
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "fermetures-error" : "fermetures-hint"}
          className={`${inputClasses} min-h-24 py-2`}
        />
        {error ? (
          <FieldError id="fermetures-error">{error}</FieldError>
        ) : (
          <Hint id="fermetures-hint">{t.closuresHint}</Hint>
        )}
      </div>
      <CheckboxField name="feries" defaultChecked={holidaysClosed}>
        {t.holidays}
      </CheckboxField>
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {t.closuresSave}
      </Button>
    </form>
  );
}
