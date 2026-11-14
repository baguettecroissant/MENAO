"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { startTopUp } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans.agents;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Recharge de minutes (ADR 0233) : ouvre le paiement Stripe, sur le site uniquement. */
export function TopUpForm({
  offer,
  primary,
}: {
  offer: { code: string; minutes: number; priceCents: number; months: number };
  primary: boolean;
}) {
  const [state, action, pending] = useActionState(startTopUp, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="offer" value={offer.code} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button
        type="submit"
        variant={primary ? "primary" : "secondary"}
        disabled={pending}
        className="!rounded-pill"
      >
        {t.topUp(offer.minutes, euros.format(offer.priceCents / 100))}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.topUpHint(offer.months)}</p>
    </form>
  );
}
