"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxField, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveAvailability } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.availability;

export function AvailabilityForm({
  paused,
  availableFrom,
  today,
}: {
  paused: boolean;
  availableFrom: string | null;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveAvailability, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <CheckboxField name="paused" defaultChecked={paused}>
        {t.paused}
      </CheckboxField>
      <Field
        name="availableFrom"
        type="date"
        min={today}
        defaultValue={availableFrom ?? ""}
        label={t.from}
        hint={t.fromHint}
        errors={state.fieldErrors?.availableFrom}
      />
      <Button type="submit" disabled={pending}>
        {t.save}
      </Button>
    </form>
  );
}
