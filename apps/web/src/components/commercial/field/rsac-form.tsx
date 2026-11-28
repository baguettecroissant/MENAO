"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { saveRsac } from "@/lib/commercial/onboarding-actions";

const t = fr.commercialField.start.steps.rsac;

/** Numéro RSAC et greffe, repliés derrière « Modifier » une fois enregistrés (ADR 0394). */
export function RsacForm({ numero, greffe }: { numero: string | null; greffe: string | null }) {
  const [state, action, pending] = useActionState(saveRsac, initialFormState);
  const [open, setOpen] = useState(!numero);
  const errors = state.fieldErrors ?? {};
  if (!open && !state.error && !state.fieldErrors) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold whitespace-nowrap text-primary-strong hover:underline"
      >
        {t.edit}
      </button>
    );
  }
  return (
    <form
      action={action}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-start"
      noValidate
    >
      <div className="flex-1">
        <Field
          label={t.number}
          name="numero"
          defaultValue={state.values?.numero ?? numero ?? ""}
          errors={errors.numero}
          autoComplete="off"
          maxLength={40}
        />
      </div>
      <div className="flex-1">
        <Field
          label={t.greffe}
          name="greffe"
          defaultValue={state.values?.greffe ?? greffe ?? ""}
          errors={errors.greffe}
          maxLength={80}
        />
      </div>
      <Button type="submit" block={false} disabled={pending} className="sm:mt-7">
        {t.save}
      </Button>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
