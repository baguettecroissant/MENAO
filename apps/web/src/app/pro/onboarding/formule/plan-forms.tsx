"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { openBillingPortal, startCheckout } from "@/lib/artisan/actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans;

export function ChoosePlan({ code, nom }: { code: string; nom: string }) {
  const [state, action, pending] = useActionState(startCheckout, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="plan" value={code} />
      <Button type="submit" disabled={pending}>
        {t.choose(nom)}
      </Button>
    </form>
  );
}

export function ManageSubscription() {
  const [state, action, pending] = useActionState<FormState>(openBillingPortal, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.manage}
      </Button>
    </form>
  );
}
