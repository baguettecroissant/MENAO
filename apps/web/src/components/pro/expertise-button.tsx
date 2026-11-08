"use client";

import { ChevronRight, Users } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, SelectField, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reportExpertise } from "@/lib/artisan/chantier-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.expertise;

/**
 * « Ce chantier a besoin d'une expertise » (maquettes F-17, F-18) : signalement à l'équipe MENAO.
 * `card` : carte de la colonne de droite des fiches (refonte « Nette », ADR 0246).
 */
export function ExpertiseButton({
  requestId,
  trades,
  variant = "banner",
}: {
  requestId: string;
  trades: readonly { code: string; label: string }[];
  variant?: "banner" | "card";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportExpertise.bind(null, requestId),
    initialFormState,
  );
  const close = useCallback(() => setOpen(false), []);
  useActionSuccess(state, close);

  const trigger = state.success ? (
    <Alert tone="success">{state.success}</Alert>
  ) : variant === "card" ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
        <Users aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{fr.pro.sheet.expertiseTitle}</span>
        <span className="text-sm text-muted-foreground">{fr.pro.sheet.expertiseText}</span>
      </span>
      <ChevronRight aria-hidden="true" className="mt-2.5 size-5 shrink-0 text-muted-foreground" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`${buttonClasses({ variant: "outline", size: "sm" })} min-h-10`}
    >
      {t.open}
    </button>
  );

  return (
    <div className={variant === "card" ? "" : "border-b border-border bg-surface"}>
      {variant === "card" ? (
        trigger
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">{trigger}</div>
      )}
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
