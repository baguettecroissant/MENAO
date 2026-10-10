"use client";

import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, SelectField, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reportExpertise } from "@/lib/artisan/chantier-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.expertise;

/** « Ce chantier a besoin d'une expertise » (maquettes F-17, F-18) : signalement à l'équipe MENAO. */
export function ExpertiseButton({
  requestId,
  trades,
}: {
  requestId: string;
  trades: readonly { code: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportExpertise.bind(null, requestId),
    initialFormState,
  );
  const close = useCallback(() => setOpen(false), []);
  useActionSuccess(state, close);

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        {state.success ? (
          <Alert tone="success">{state.success}</Alert>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`${buttonClasses({ variant: "outline", size: "sm" })} min-h-10`}
          >
            {t.open}
          </button>
        )}
      </div>
      <Drawer open={open} onClose={close} title={t.title} backLabel={fr.pro.appointment.backToForm}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <SelectField
            label={t.trade}
            name="trade"
            defaultValue={state.values?.trade ?? ""}
            required
            errors={state.fieldErrors?.trade}
          >
            <option value="" disabled>
              {t.choose}
            </option>
            {trades.map((trade) => (
              <option key={trade.code} value={trade.code}>
                {trade.label}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expertise-message" className="text-sm font-medium">
              {t.message}{" "}
              <span className="font-normal text-subtle-foreground">{t.messageNote}</span>
            </label>
            <textarea
              id="expertise-message"
              name="message"
              defaultValue={state.values?.message}
              rows={3}
              maxLength={2000}
              className={`${inputClasses} min-h-24 py-3`}
            />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {t.submit}
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
