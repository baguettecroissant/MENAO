"use client";

import { ANNUAL_FREE_MONTHS } from "@menao/core";
import { Check, CreditCard } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { choosePlan, openBillingPortal, startCheckout } from "@/lib/artisan/actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans;

/** Au mois ou à l'année (ADR 0200) : le bouton choisi donne la périodicité. */
export function ChoosePlan({ code, nom }: { code: string; nom: string }) {
  const [state, action, pending] = useActionState(startCheckout, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="plan" value={code} />
      <Button
        type="submit"
        name="periodicite"
        value="mensuel"
        disabled={pending}
        aria-label={t.chooseMonthly(nom)}
      >
        {t.monthlyLabel}
      </Button>
      <Button
        type="submit"
        name="periodicite"
        value="annuel"
        variant="outline"
        disabled={pending}
        aria-label={t.chooseYearly(nom, ANNUAL_FREE_MONTHS)}
      >
        {t.yearlyLabel(ANNUAL_FREE_MONTHS)}
      </Button>
    </form>
  );
}

/** Avant la validation (ADR 0353) : le choix est gardé, rien n'est payé. */
export function PickPlan({ code, nom, chosen }: { code: string; nom: string; chosen: boolean }) {
  const [state, action, pending] = useActionState(choosePlan, initialFormState);
  if (chosen)
    return (
      <p
        role="status"
        className="flex min-h-touch items-center justify-center gap-2 rounded-pill bg-success px-5 font-semibold text-white"
      >
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
        {t.choice.chosen}
      </p>
    );
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="plan" value={code} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        aria-label={t.choice.chooseLabel(nom)}
      >
        {t.choice.choose}
      </Button>
    </form>
  );
}

export function ManageSubscription() {
  const [state, action, pending] = useActionState<FormState>(openBillingPortal, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" variant="secondary" block={false} disabled={pending}>
        <CreditCard aria-hidden="true" className="size-4" />
        {t.manage}
      </Button>
    </form>
  );
}
