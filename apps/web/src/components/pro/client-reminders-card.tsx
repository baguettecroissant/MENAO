"use client";

import { CLIENT_REMINDER_KINDS, type ClientRemindersState } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveClientReminders } from "@/lib/artisan/reminder-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans.clientReminders;

/**
 * « Rappels à vos clients » (F-88, ADR 0239), dans « Ma formule » (Premium et Entreprise) :
 * quels rappels partent aussi par SMS, au nom de l'artisan, et les SMS du mois.
 */
export function ClientRemindersCard({ state }: { state: ClientRemindersState }) {
  const [result, action, pending] = useActionState(saveClientReminders, initialFormState);
  const ratio = state.smsIncluded ? Math.min(state.smsUsed / state.smsIncluded, 1) : 0;
  // Refonte « Nette » (lot 46, ADR 0315) : interrupteurs, compteur des SMS, bouton en bas.
  return (
    <Card id="rappels" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[1.0625rem] font-bold tracking-tight">{t.title}</h2>
        <p className="text-[0.84375rem] leading-[1.45] text-muted-foreground">{t.intro}</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <fieldset className="flex flex-col">
          <legend className="sr-only">{t.title}</legend>
          {CLIENT_REMINDER_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex cursor-pointer items-center justify-between gap-3 border-t border-border py-2.5 text-[0.90625rem]"
            >
              {t.items[kind]}
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  role="switch"
                  name={kind}
                  defaultChecked={state.enabled[kind]}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="h-[1.625rem] w-11 rounded-full bg-border-strong transition-colors peer-checked:bg-success peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px] motion-reduce:transition-none"
                />
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.84375rem] font-semibold tabular-nums">
            {t.smsCount(state.smsUsed, state.smsIncluded)}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={state.smsIncluded}
            aria-valuenow={state.smsUsed}
            aria-label={t.smsCount(state.smsUsed, state.smsIncluded)}
            className="h-2 overflow-hidden rounded-pill bg-border"
          >
            <div className="h-full rounded-pill bg-primary" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t.smsHint}</p>
        </div>
        {result.error && <Alert tone="error">{result.error}</Alert>}
        {result.success && <Alert tone="success">{result.success}</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="!rounded-pill">
          {pending ? t.saving : t.save}
        </Button>
      </form>
    </Card>
  );
}
