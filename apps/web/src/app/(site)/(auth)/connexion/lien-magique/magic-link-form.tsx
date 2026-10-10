"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendMagicLink } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initialFormState);

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={fr.magicLink.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <Button type="submit" disabled={pending}>
        {fr.magicLink.submit}
      </Button>
    </form>
  );
}
