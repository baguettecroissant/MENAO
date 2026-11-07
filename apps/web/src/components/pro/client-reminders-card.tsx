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
  return (
    <Card id="rappels" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t.title}</legend>
          {CLIENT_REMINDER_KINDS.map((kind) => (
            <label key={kind} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name={kind}
                defaultChecked={state.enabled[kind]}
                className="size-5 accent-primary"
              />
              {t.items[kind]}
            </label>
          ))}
        </fieldset>
        {result.error && <Alert tone="error">{result.error}</Alert>}
        {result.success && <Alert tone="success">{result.success}</Alert>}
        <Button type="submit" size="sm" block={false} disabled={pending} className="self-start">
          {pending ? t.saving : t.save}
        </Button>
      </form>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium tabular-nums">
          {t.smsCount(state.smsUsed, state.smsIncluded)}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.smsIncluded}
          aria-valuenow={state.smsUsed}
          aria-label={t.smsCount(state.smsUsed, state.smsIncluded)}
          className="h-2 overflow-hidden rounded-pill bg-background"
        >
          <div className="h-full rounded-pill bg-primary" style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{t.smsHint}</p>
      </div>
    </Card>
  );
}
