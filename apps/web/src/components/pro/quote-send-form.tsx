"use client";

import { QUOTE_VALIDITY_DAYS, isValidDepositPercent, paymentSchedule } from "@menao/core";
import { useActionState, useState, type ReactNode } from "react";
import { Alert, Button, Field, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendQuote } from "@/lib/artisan/quote-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.quote.send;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
type Schedule = "defaut" | "personnalise";

const optionClasses = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${
    selected
      ? "border-primary bg-primary-softer in-[.app-nette]:border-foreground in-[.app-nette]:bg-surface in-[.app-nette]:shadow-[inset_0_0_0_1px_var(--color-foreground)]"
      : "border-border bg-surface hover:bg-background"
  }`;

/**
 * « Envoi du devis » (F-21, maquettes « Envoi du devis ») : échéancier par défaut ou
 * personnalisé (acompte à la signature, solde à la réception, montants de @menao/core), dates
 * des travaux (F-20), puis envoi. Le rattachement au chantier est passé en `children`.
 */
export function QuoteSendForm({
  quoteId,
  totalTtcCents,
  defaultDeposit,
  minStartDate,
  children,
}: {
  quoteId: string;
  totalTtcCents: number;
  defaultDeposit: number;
  /** Lendemain (heure de Paris), au format AAAA-MM-JJ. */
  minStartDate: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    sendQuote.bind(null, quoteId),
    initialFormState,
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [deposit, setDeposit] = useState(String(defaultDeposit));
  const errors = state.fieldErrors ?? {};
  const tranches = (percent: number) =>
    paymentSchedule(totalTtcCents, percent).map((tranche) =>
      t.tranche(tranche.percent, tranche.trigger, euros.format(tranche.amountCents / 100)),
    );
  const custom = Number(deposit);

  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col">
      {/* Refonte « Nette » (ADR 0255) : l'échéancier et les dates à gauche ; le total, le rappel
          et l'envoi à droite (l'envoi reste collé en bas sur téléphone). */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start lg:[grid-template-areas:'main_side'_'main_send']">
        <div className="flex flex-col gap-6 lg:[grid-area:main]">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <fieldset className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <legend className="float-left mb-3 w-full font-display text-[1.0625rem] font-bold">
              {t.scheduleTitle}
            </legend>
            <label className={optionClasses(schedule === "defaut")}>
              <input
                type="radio"
                name="schedule"
                value="defaut"
                checked={schedule === "defaut"}
                onChange={() => setSchedule("defaut")}
                className="mt-0.5 size-4 accent-primary in-[.app-nette]:accent-foreground"
              />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{t.defaultSchedule}</span>
                <span className="flex flex-col text-sm text-muted-foreground">
                  {tranches(defaultDeposit).map((line) => (
                    <span key={line}>• {line}</span>
                  ))}
                </span>
              </span>
            </label>
            <label className={optionClasses(schedule === "personnalise")}>
              <input
                type="radio"
                name="schedule"
                value="personnalise"
                checked={schedule === "personnalise"}
                onChange={() => setSchedule("personnalise")}
                className="mt-0.5 size-4 accent-primary in-[.app-nette]:accent-foreground"
              />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{t.customSchedule}</span>
                <span className="text-sm text-muted-foreground">{t.customHint}</span>
              </span>
            </label>
            {schedule === "defaut" && (
              <input type="hidden" name="depositPercent" value={defaultDeposit} />
            )}
            {schedule === "personnalise" && (
              <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="deposit" className="text-sm font-medium">
                    {t.deposit}
                  </label>
                  <input
                    id="deposit"
                    name="depositPercent"
                    inputMode="numeric"
                    value={deposit}
                    onChange={(event) => setDeposit(event.target.value)}
                    aria-invalid={errors.depositPercent ? true : undefined}
                    className={`${inputClasses} max-w-32`}
                  />
                  {errors.depositPercent && <FieldError>{errors.depositPercent[0]}</FieldError>}
                </div>
                {isValidDepositPercent(custom) && (
                  <p className="flex flex-col text-sm text-muted-foreground">
                    {tranches(custom).map((line) => (
                      <span key={line}>• {line}</span>
                    ))}
                  </p>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="saveDefault" className="size-4 accent-primary" />
                  {t.saveDefault}
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <legend className="float-left mb-3 w-full font-display text-[1.0625rem] font-bold">
              {t.datesTitle}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t.startDate}
                name="startDate"
                type="date"
                min={minStartDate}
                defaultValue={state.values?.startDate}
                errors={errors.startDate}
              />
              <Field
                label={t.duration}
                name="durationDays"
                inputMode="numeric"
                defaultValue={state.values?.durationDays}
                errors={errors.durationDays}
              />
            </div>
            <Hint>{t.datesHint}</Hint>
            <p className="text-xs text-muted-foreground">{t.validity(QUOTE_VALIDITY_DAYS)}</p>
          </fieldset>
        </div>

        <div className="flex flex-col gap-4 lg:[grid-area:side]">
          <div className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <span className="text-sm font-semibold text-label">{fr.pro.quote.totalTtc}</span>
            <span className="font-display text-[2.5rem] leading-none font-bold tracking-tight">
              {euros.format(totalTtcCents / 100)}
            </span>
          </div>
          <section aria-label={t.attachTitle} className="flex flex-col gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-label">{t.attachTitle}</h2>
            {children}
          </section>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-1 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-card lg:border lg:bg-surface lg:p-5 lg:shadow-card lg:[grid-area:send]">
          <Button type="submit" size="lg" disabled={schedule === null || pending}>
            {pending ? t.sending : t.submit}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t.footer}</p>
        </div>
      </div>
    </form>
  );
}
