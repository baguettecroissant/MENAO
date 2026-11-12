"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { checkTenderQuantities } from "@/lib/artisan/tender-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan.check;

/**
 * « J'ai vérifié les quantités » (F-140, ADR 0292) : obligatoire avant l'export d'un DPGF créé
 * depuis les plans. Enregistré dès que la case change.
 */
export function QuantitiesCheck({ tenderId, checked }: { tenderId: string; checked: boolean }) {
  const [state, formAction] = useActionState(checkTenderQuantities, initialFormState);
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-3 rounded-input border border-border-strong bg-surface p-3 text-sm has-[:checked]:border-success has-[:checked]:bg-success-soft">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={(e) => {
            const next = e.target.checked;
            const data = new FormData();
            data.set("tenderId", tenderId);
            data.set("checked", String(next));
            startTransition(() => {
              setOptimistic(next);
              formAction(data);
            });
          }}
          className="mt-0.5 size-[1.125rem] shrink-0 accent-success"
        />
        <span>{t.label}</span>
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </div>
  );
}
