"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { payDeposit } from "@/lib/project/quote-actions";

const t = fr.clientQuote.deposit;

/** « Payer l'acompte » (F-31) : redirection vers le paiement Stripe du compte de l'artisan. */
export function DepositPayButton({ quoteId, amount }: { quoteId: string; amount: string }) {
  const [state, formAction, pending] = useActionState(
    payDeposit.bind(null, quoteId),
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
