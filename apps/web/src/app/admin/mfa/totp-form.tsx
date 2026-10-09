"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { verifyTotp } from "@/lib/admin/mfa-actions";
import { initialFormState } from "@/lib/auth/form";

export function TotpForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyTotp, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      <Field
        label={fr.admin.mfa.code}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        required
        errors={state.fieldErrors?.code}
      />
      <Button type="submit" disabled={pending}>
        {fr.admin.mfa.submit}
      </Button>
    </form>
  );
}
