"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { PasswordField } from "@/components/form-fields";
import { fr } from "@/i18n/fr";
import { signIn } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field
        label={fr.signIn.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <PasswordField
        label={fr.signIn.password}
        name="password"
        autoComplete="current-password"
        required
        errors={errors.password}
      />
      <Button type="submit" disabled={pending}>
        {fr.signIn.submit}
      </Button>
    </form>
  );
}
