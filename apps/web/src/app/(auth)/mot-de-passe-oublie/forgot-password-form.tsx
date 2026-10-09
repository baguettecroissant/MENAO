"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialFormState);

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={fr.forgotPassword.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <Button type="submit" disabled={pending}>
        {fr.forgotPassword.submit}
      </Button>
    </form>
  );
}
