"use client";

import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { updatePassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={fr.resetPassword.password}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={fr.resetPassword.passwordHint}
        errors={state.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending}>
        {fr.resetPassword.submit}
      </Button>
    </form>
  );
}
