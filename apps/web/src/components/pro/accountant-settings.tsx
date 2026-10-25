"use client";

import { ACCOUNTANT_PERIODS } from "@menao/core";
import { Send } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Card, CheckboxField, Field, RadioGroup } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  saveAccountantSettings,
  sendAccountantExportNow,
  type AccountantSendResult,
} from "@/lib/artisan/accountant-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.accountant;

export type AccountantSettingsValues = {
  enabled: boolean;
  email: string;
  period: (typeof ACCOUNTANT_PERIODS)[number];
  includeInvoices: boolean;
  includeExpenses: boolean;
};

/**
 * Réglages de l'envoi au comptable (F-63) : envoi automatique, adresse, rythme et parties
 * envoyées ; puis « Envoyer maintenant » pour la dernière période complète.
 */
export function AccountantSettingsForm({
  initial,
  saved,
  lastPeriod,
  nextSend,
}: {
  initial: AccountantSettingsValues;
  /** Réglages déjà enregistrés : l'envoi à la main est possible. */
  saved: boolean;
  /** « septembre 2026 » : période envoyée par « Envoyer maintenant ». */
  lastPeriod: string;
  /** Date du prochain envoi automatique, en toutes lettres (null : désactivé). */
  nextSend: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveAccountantSettings, initialFormState);
  const [result, setResult] = useState<AccountantSendResult | null>(null);
  const [sending, startSending] = useTransition();
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const checked = (name: keyof AccountantSettingsValues) =>
    values ? values[name] === "on" : Boolean(initial[name]);

  return (
    <>
      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-medium">{t.settingsTitle}</h2>
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <CheckboxField name="enabled" defaultChecked={checked("enabled")}>
            {t.enabled}
          </CheckboxField>
          <Field
            label={t.email}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values?.email ?? initial.email}
            errors={errors.email}
            required
          />
          <RadioGroup
            legend={t.period}
            name="period"
            defaultValue={values?.period ?? initial.period}
            options={ACCOUNTANT_PERIODS.map((value) => ({
              value,
              label: t.periods[value].label,
              description: t.periods[value].detail,
            }))}
            errors={errors.period}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-medium">{t.parts}</legend>
            <CheckboxField name="includeInvoices" defaultChecked={checked("includeInvoices")}>
              {t.invoices}
            </CheckboxField>
            <CheckboxField
              name="includeExpenses"
              defaultChecked={checked("includeExpenses")}
              errors={errors.includeExpenses}
            >
              {t.expenses}
            </CheckboxField>
          </fieldset>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.success && <Alert tone="success">{state.success}</Alert>}
          <p className="text-sm text-muted-foreground">{nextSend ? t.next(nextSend) : t.off}</p>
          <Button type="submit" disabled={pending} block={false} className="self-start">
            {pending ? t.saving : t.save}
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">{t.sendTitle}</h2>
        {saved ? (
          <>
            <p className="text-sm text-muted-foreground">{t.sendLead(lastPeriod, initial.email)}</p>
            {result?.status === "envoye" && <Alert tone="success">{t.sent(result.period)}</Alert>}
            {result && result.status !== "envoye" && (
              <Alert tone="error">{t.sendErrors[result.status]}</Alert>
            )}
            <Button
              type="button"
              variant="outline"
              block={false}
              className="self-start"
              disabled={sending}
              onClick={() =>
                startSending(async () => {
                  setResult(null);
                  setResult(await sendAccountantExportNow());
                })
              }
            >
              <Send aria-hidden="true" className="size-4" />
              {sending ? t.sending : t.send(lastPeriod)}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.saveFirst}</p>
        )}
      </Card>
    </>
  );
}
