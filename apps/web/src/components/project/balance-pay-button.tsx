"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { payBalance } from "@/lib/project/reception-actions";

const t = fr.balance;

/** « Payer le solde » (F-32) : redirection vers le paiement Stripe du compte de l'artisan. */
export function BalancePayButton({ chantierId, amount }: { chantierId: string; amount: string }) {
  const [state, formAction, pending] = useActionState(
    payBalance.bind(null, chantierId),
    initialFormState,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.submitting : t.submit(amount)}
      </Button>
    </form>
  );
}
