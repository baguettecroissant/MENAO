"use client";

import { paymentSchedule, paymentScheduleError } from "@menao/core";
import { messages } from "@menao/validation";
import { useActionState, useState } from "react";
import { Alert, Button, FieldError } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePaymentDefaults } from "@/lib/artisan/money-actions";
import { initialFormState } from "@/lib/auth/form";
import { ScheduleBar, ScheduleLines, TrancheRow, percentOf } from "./payment-schedule";

const t = fr.pro.payments;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * « Mes paiements » (F-146, maquette lot 40) : modèles en un clic, barre de l'échéancier, acompte
 * et démarrage réglables (0 % possible), solde calculé ; exemple chiffré et conseil à côté.
 */
export function PaymentDefaultsForm({
  deposit: initialDeposit,
  start: initialStart,
}: {
  deposit: number;
  start: number;
}) {
  const [state, action, pending] = useActionState(savePaymentDefaults, initialFormState);
  const [deposit, setDeposit] = useState(String(initialDeposit));
  const [start, setStart] = useState(String(initialStart));
  const d = percentOf(deposit);
  const s = percentOf(start);
  const invalid = deposit === "" || start === "" || paymentScheduleError(d, s) !== null;
  const tranches = paymentSchedule(t.exampleTotalCents, invalid ? 0 : d, invalid ? 0 : s);
  const percent = (trigger: "signature" | "demarrage" | "reception") =>
    tranches.find((tranche) => tranche.trigger === trigger)?.percent ?? 0;
  const errors = state.fieldErrors ?? {};
  const fieldError = errors.depositPercent?.[0] ?? errors.startPercent?.[0];
  const balanceError = !invalid ? null : d + s > 99 ? messages.scheduleNoBalance : null;

  return (
    <div className="@container">
      <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-start @4xl:gap-5">
        <form
          action={action}
          className="@container/form flex min-w-0 flex-1 flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
        >
          <div className="flex flex-col gap-1 @lg/form:flex-row @lg/form:items-baseline @lg/form:justify-between @lg/form:gap-4">
            <h2 className="text-[1.1875rem] font-bold">{t.scheduleTitle}</h2>
            <p className="text-[0.8125rem] text-muted-foreground">{t.scheduleHint}</p>
          </div>
          <div
            role="group"
            aria-label={t.templatesLabel}
            className="grid grid-cols-2 gap-2.5 @lg/form:grid-cols-4"
          >
            {t.templates.map((model) => {
              const active = d === model.deposit && s === model.start;
              return (
                <button
                  key={model.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDeposit(String(model.deposit));
                    setStart(String(model.start));
                  }}
                  className={`flex flex-col gap-0.5 rounded-input bg-surface px-3.5 py-3 text-left transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
                    active
                      ? "border-2 border-foreground"
                      : "border border-border hover:bg-background"
                  }`}
                >
                  <span className="text-[0.9375rem] font-bold tabular-nums">{model.label}</span>
                  <span className="text-[0.78rem] text-muted-foreground">{model.hint}</span>
                </button>
              );
            })}
          </div>
          <ScheduleBar tranches={tranches} />
          <div>
            <TrancheRow
              trigger="signature"
              title={t.rows.signature.title}
              hint={t.rows.signature.hint}
              percent={d}
              input={{
                id: "paiement-acompte",
                name: "depositPercent",
                value: deposit,
                label: t.percentLabel(t.rows.signature.title),
                onChange: setDeposit,
                invalid: Boolean(errors.depositPercent),
              }}
            />
            <TrancheRow
              trigger="demarrage"
              title={t.rows.demarrage.title}
              hint={t.rows.demarrage.hint}
              percent={s}
              input={{
                id: "paiement-demarrage",
                name: "startPercent",
                value: start,
                label: t.percentLabel(t.rows.demarrage.title),
                onChange: setStart,
                invalid: Boolean(errors.startPercent) || balanceError !== null,
              }}
            />
            <TrancheRow
              trigger="reception"
              title={t.rows.reception.title}
              hint={t.rows.reception.hint}
              percent={invalid ? Math.max(0, 100 - d - s) : percent("reception")}
            />
          </div>
          {(balanceError ?? fieldError) && <FieldError>{balanceError ?? fieldError}</FieldError>}
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.success && !pending && (
            <p role="status" className="text-sm font-medium text-success">
              {state.success}
            </p>
          )}
          <div className="flex flex-col gap-3 pt-1.5 @lg/form:flex-row @lg/form:items-center @lg/form:justify-between @lg/form:gap-4">
            <p className="text-[0.8125rem] text-muted-foreground">{t.total}</p>
            <Button type="submit" block={false} disabled={pending || invalid} className="px-6">
              {pending ? t.saving : t.save}
            </Button>
          </div>
        </form>

        <div className="grid gap-4 @2xl:grid-cols-2 @4xl:flex @4xl:w-[21.25rem] @4xl:shrink-0 @4xl:flex-col">
          <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-[1.0625rem] font-bold">
              {t.exampleTitle(euros.format(t.exampleTotalCents / 100).replace(",00", ""))}
            </h2>
            <ScheduleLines
              divided
              lines={tranches.map((tranche) => ({
                trigger: tranche.trigger,
                label: t.exampleLines[tranche.trigger],
                amount: euros.format(tranche.amountCents / 100),
              }))}
            />
            <p className="text-[0.78rem] leading-relaxed text-muted-foreground">{t.exampleNote}</p>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-base font-bold">{t.tipTitle}</h2>
            <p className="text-[0.84rem] leading-relaxed text-label">{t.tip}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
