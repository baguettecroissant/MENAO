"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { stopSubscription } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans.stop;
const REASONS = ["demandes", "prix", "activite", "autre"] as const;

/** Motif facultatif, confirmation et retour (maquette du lot 74, écrans 4 et 5). */
export function StopForm({ confirmLabel }: { confirmLabel: string }) {
  const [state, action, pending] = useActionState(stopSubscription, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold text-label">{t.reasonsLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((reason) => (
            <label
              key={reason}
              className="cursor-pointer rounded-pill border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-label has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary-strong has-focus-visible:ring-2 has-focus-visible:ring-primary"
            >
              <input type="radio" name="motif" value={reason} className="sr-only" />
              {t.reasons[reason]}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {confirmLabel}
        </Button>
        <Link
          href={"/pro/onboarding/formule" as Route}
          className={`inline-flex min-h-11 items-center justify-center rounded-sm px-3 font-bold text-primary-strong ${focusRing}`}
        >
          {t.keep}
        </Link>
      </div>
    </form>
  );
}
