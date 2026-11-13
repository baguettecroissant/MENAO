"use client";

import { QUOTE_VALIDITY_DAYS, paymentSchedule, paymentScheduleError } from "@menao/core";
import { messages } from "@menao/validation";
import { Send, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Field, FieldError, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendQuote } from "@/lib/artisan/quote-actions";
import { initialFormState } from "@/lib/auth/form";
import { ScheduleBar, ScheduleLines, TrancheRow, percentOf } from "./payment-schedule";

const t = fr.pro.quote.send;
const l = fr.pro.quote.library;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
type Schedule = "defaut" | "personnalise";

const optionClasses = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${
    selected
      ? "border-primary bg-primary-softer in-[.app-nette]:border-foreground in-[.app-nette]:bg-surface in-[.app-nette]:shadow-[inset_0_0_0_1px_var(--color-foreground)]"
      : "border-border bg-surface hover:bg-background"
  }`;

/**
 * « Envoi du devis » (F-21, maquettes « Envoi du devis » et lot 40) : échéancier par défaut ou
 * personnalisé (acompte à la signature, 0 % possible, paiement facultatif au démarrage, solde
 * calculé à la réception ; montants de @menao/core, barre en direct), dates des travaux (F-20),
 * puis envoi. Le rattachement au chantier est passé en `children`.
 */
export function QuoteSendForm({
  quoteId,
  totalTtcCents,
  defaultDeposit,
  defaultStart = 0,
  minStartDate,
  margin = null,
  children,
}: {
  /**
   * Marge sous le seuil fixé par l'artisan (maquette du lot 36) : une fenêtre le dit avant
   * l'envoi, qui reste possible.
   */
  margin?: { client: string; title: string; reviewHref: string } | null;
  quoteId: string;
  totalTtcCents: number;
  defaultDeposit: number;
  /** Part par défaut payée au démarrage des travaux (F-146). */
  defaultStart?: number;
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
  const [start, setStart] = useState(String(defaultStart));
  const errors = state.fieldErrors ?? {};
  const d = percentOf(deposit);
  const st = percentOf(start);
  const customInvalid = deposit === "" || start === "" || paymentScheduleError(d, st) !== null;
  const defaults = paymentSchedule(totalTtcCents, defaultDeposit, defaultStart);
  const custom = paymentSchedule(totalTtcCents, customInvalid ? 0 : d, customInvalid ? 0 : st);
  // Récapitulatif à droite : l'échéancier choisi (par défaut tant que rien n'est choisi).
  const shown = schedule === "personnalise" ? custom : defaults;
  const amountOf = (trigger: "signature" | "demarrage" | "reception") =>
    euros.format((custom.find((x) => x.trigger === trigger)?.amountCents ?? 0) / 100);
  const percentIn = (trigger: "signature" | "demarrage" | "reception") =>
    custom.find((x) => x.trigger === trigger)?.percent ?? 0;
  const balanceError =
    schedule === "personnalise" && customInvalid && d + st > 99 ? messages.scheduleNoBalance : null;
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (margin && !confirmed.current) {
          e.preventDefault();
          setAsking(true);
        }
      }}
      noValidate
      className="flex flex-1 flex-col"
    >
      {asking && margin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="envoi-marge-titre"
            className="flex w-full max-w-xl animate-menao-fade-up flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-raised"
          >
            <h2 id="envoi-marge-titre" className="text-xl font-bold">
              {l.confirmTitle(margin.client)}
            </h2>
            <p className="flex justify-between gap-3 text-[0.9375rem]">
              <span className="text-muted-foreground">{l.confirmTotal}</span>
              <span className="font-semibold tabular-nums">
                {euros.format(totalTtcCents / 100)}
              </span>
            </p>
            <div className="flex items-start gap-3 rounded-input border border-warning/30 bg-warning-soft p-4 text-warning">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-surface">
                <TriangleAlert aria-hidden="true" className="size-4" />
              </span>
              <span className="flex flex-col gap-1 text-[0.9375rem]">
                <span className="font-bold">{margin.title}</span>
                <span>{l.belowText}</span>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={margin.reviewHref as Route}
                className="flex min-h-12 items-center justify-center rounded-pill border border-border-strong bg-surface font-semibold hover:bg-background"
              >
                {l.review}
              </Link>
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  confirmed.current = true;
                  setAsking(false);
                  formRef.current?.requestSubmit();
                }}
              >
                <Send aria-hidden="true" className="size-4" />
                {l.sendAnyway}
              </Button>
            </div>
            <p className="text-center text-[0.8125rem] text-muted-foreground">{l.privacy}</p>
          </div>
        </div>
      )}
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
                <span className="text-sm text-muted-foreground">
                  {defaults.map((tranche) => t.short(tranche.percent, tranche.trigger)).join(" · ")}
                </span>
              </span>
            </label>
            <div className="flex flex-col">
              <label
                className={`${optionClasses(schedule === "personnalise")} ${schedule === "personnalise" ? "rounded-b-none" : ""}`}
              >
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
              {schedule === "personnalise" && (
                <div className="flex flex-col gap-1 rounded-b-card border border-t-0 border-primary bg-surface px-4 pt-1 pb-3 in-[.app-nette]:border-foreground in-[.app-nette]:shadow-[inset_0_0_0_1px_var(--color-foreground)]">
                  <TrancheRow
                    trigger="signature"
                    title={t.customRows.signature.title}
                    hint={t.customRows.signature.hint}
                    percent={d}
                    amount={amountOf("signature")}
                    input={{
                      id: "envoi-acompte",
                      name: "depositPercent",
                      value: deposit,
                      label: t.deposit,
                      onChange: setDeposit,
                      invalid: Boolean(errors.depositPercent),
                    }}
                  />
                  <TrancheRow
                    trigger="demarrage"
                    title={t.customRows.demarrage.title}
                    hint={t.customRows.demarrage.hint}
                    percent={st}
                    amount={amountOf("demarrage")}
                    input={{
                      id: "envoi-demarrage",
                      name: "startPercent",
                      value: start,
                      label: fr.pro.payments.percentLabel(t.customRows.demarrage.title),
                      onChange: setStart,
                      invalid: Boolean(errors.startPercent) || balanceError !== null,
                    }}
                  />
                  <TrancheRow
                    trigger="reception"
                    title={t.customRows.reception.title}
                    hint={t.customRows.reception.hint}
                    percent={customInvalid ? Math.max(0, 100 - d - st) : percentIn("reception")}
                    amount={amountOf("reception")}
                  />
                  {(balanceError ?? errors.depositPercent?.[0] ?? errors.startPercent?.[0]) && (
                    <FieldError>
                      {balanceError ?? errors.depositPercent?.[0] ?? errors.startPercent?.[0]}
                    </FieldError>
                  )}
                  <label className="flex items-center gap-2.5 pt-1.5 text-sm">
                    <input type="checkbox" name="saveDefault" className="size-4 accent-primary" />
                    {t.saveDefault}
                  </label>
                </div>
              )}
            </div>
            {schedule === "defaut" && (
              <>
                <input type="hidden" name="depositPercent" value={defaultDeposit} />
                <input type="hidden" name="startPercent" value={defaultStart} />
              </>
            )}
            <Link
              href={"/pro/paiements" as Route}
              className="self-start text-[0.84rem] font-semibold text-primary-strong hover:underline"
            >
              {t.defaultsLink}
            </Link>
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
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-label">{fr.pro.quote.totalTtc}</span>
              <span className="font-display text-[2.5rem] leading-none font-bold tracking-tight">
                {euros.format(totalTtcCents / 100)}
              </span>
            </div>
            <ScheduleBar tranches={shown} height="h-3" />
            <ScheduleLines
              lines={shown.map((tranche) => ({
                trigger: tranche.trigger,
                label: t.short(tranche.percent, tranche.trigger),
                amount: euros.format(tranche.amountCents / 100),
              }))}
            />
          </div>
          <section aria-label={t.attachTitle} className="flex flex-col gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-label">{t.attachTitle}</h2>
            {children}
          </section>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-1 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-card lg:border lg:bg-surface lg:p-5 lg:shadow-card lg:[grid-area:send]">
          <Button
            type="submit"
            size="lg"
            disabled={
              schedule === null || pending || (schedule === "personnalise" && customInvalid)
            }
          >
            {pending ? t.sending : t.submit}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t.footer}</p>
        </div>
      </div>
    </form>
  );
}
