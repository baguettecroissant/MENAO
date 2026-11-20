"use client";

import {
  ANNUAL_FREE_MONTHS,
  TERM_CHECKBOX,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
} from "@menao/core";
import { CalendarDays, CreditCard, Lock, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { openBillingPortal, startCheckout } from "@/lib/artisan/actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.plans;

const c = t.checkout;
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export type CheckoutPlan = {
  code: string;
  nom: string;
  accroche: string | null;
  monthlyCents: number;
  /** Formule mise en avant (`plans.recommandee`) : encadré vert et badge. */
  featured: boolean;
  /** Demandes de chantier par mois (plafond), sous le nom de la formule. */
  requests: number | "illimite" | null;
};

/**
 * Formule et carte (F-184, ADR 0383, maquette du lot 74) : formule, mode de paiement, calendrier,
 * puis la case d'engagement, distincte de l'acceptation des conditions de vente, avant Stripe.
 */
export function PlanCheckout({
  plans,
  defaultCode,
}: {
  plans: CheckoutPlan[];
  defaultCode: string | null;
}) {
  const [state, action, pending] = useActionState(startCheckout, initialFormState);
  const [code, setCode] = useState(defaultCode ?? plans[0]?.code ?? "");
  const [yearly, setYearly] = useState(false);
  const plan = plans.find((p) => p.code === code) ?? plans[0];
  return (
    <form action={action} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">{c.planLegend}</legend>
          {plans.map((p) => (
            <label
              key={p.code}
              className={`relative flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 ${
                p.featured
                  ? `mt-2.5 border-[2.5px] border-success bg-success-soft/50 pt-5 ${code === p.code ? "shadow-card" : ""}`
                  : code === p.code
                    ? "border-2 border-primary bg-surface"
                    : "border border-border bg-surface"
              } has-focus-visible:ring-2 has-focus-visible:ring-primary`}
            >
              {/* Formule mise en avant (retour de l'utilisateur du 20/11/2026). */}
              {p.featured && (
                <span className="absolute -top-3 left-4 rounded-chip bg-success px-2.5 py-1 text-xs font-bold text-white">
                  {c.featured}
                </span>
              )}
              <input
                type="radio"
                name="plan"
                value={p.code}
                checked={code === p.code}
                onChange={() => setCode(p.code)}
                className={`size-5 shrink-0 ${p.featured ? "accent-success" : "accent-primary"}`}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[0.96875rem] font-bold">{p.nom}</span>
                {p.requests != null ? (
                  <span className="text-sm font-semibold text-foreground">
                    {p.requests === "illimite"
                      ? c.requestsUnlimited
                      : c.requestsLimited(p.requests)}
                  </span>
                ) : (
                  p.accroche && <span className="text-sm text-label">{p.accroche}</span>
                )}
              </span>
              <span className="flex flex-col items-end">
                <span className="font-bold whitespace-nowrap">
                  {yearly
                    ? c.priceYear(euros.format(annualPriceCents(p.monthlyCents) / 100))
                    : c.priceMonth(euros.format(p.monthlyCents / 100))}
                </span>
                <span className="text-xs text-label">{c.ht}</span>
              </span>
            </label>
          ))}
          <p className="text-[0.8125rem] text-label">{c.requestsNote}</p>
        </fieldset>
        <fieldset className="flex gap-1 rounded-pill bg-border/60 p-1">
          <legend className="sr-only">{c.periodLegend}</legend>
          {[false, true].map((isYearly) => (
            <label
              key={String(isYearly)}
              className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-pill px-2 text-center text-sm font-bold ${
                yearly === isYearly ? "bg-surface text-foreground shadow-card" : "text-label"
              } has-focus-visible:ring-2 has-focus-visible:ring-primary`}
            >
              <input
                type="radio"
                name="periodicite"
                value={isYearly ? "annuel" : "mensuel"}
                checked={yearly === isYearly}
                onChange={() => setYearly(isYearly)}
                className="sr-only"
              />
              {isYearly ? c.yearly(ANNUAL_FREE_MONTHS) : c.monthly}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-col gap-4">
        <p className="flex gap-3 rounded-2xl bg-success-soft p-4 text-sm text-label">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <span>
            <b className="text-foreground">{c.freeTitle}</b> {c.freeText}
          </span>
        </p>
        <section
          aria-labelledby="calendrier"
          className="flex flex-col rounded-2xl border border-border bg-surface px-4 py-1.5"
        >
          <h2
            id="calendrier"
            className="flex items-center gap-2 pt-2.5 pb-1 text-xs font-bold tracking-[0.06em] text-label uppercase"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {c.calendarTitle}
          </h2>
          <dl className="flex flex-col text-sm">
            {[
              [c.trial, c.trialValue, "font-semibold"],
              [
                c.then,
                plan
                  ? yearly
                    ? c.thenYearly(euros.format(annualPriceCents(plan.monthlyCents) / 100))
                    : c.thenMonthly(euros.format(plan.monthlyCents / 100), ENGAGEMENT_MONTHS)
                  : "—",
                "font-semibold",
              ],
            ].map(([label, value, weight], i) => (
              <div
                key={label}
                className={`flex justify-between gap-3 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <dt className="text-label">{label}</dt>
                <dd className={`text-right ${weight}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-primary/30 bg-primary-soft p-4">
          <label className="flex cursor-pointer gap-3 text-sm text-label">
            <input
              type="checkbox"
              name="engagement"
              value="oui"
              required
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              <b className="text-foreground">{TERM_CHECKBOX.lead}</b> {TERM_CHECKBOX.detail}
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 text-sm text-label">
            <input
              type="checkbox"
              name="cgv"
              value="oui"
              required
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              {c.cgvBefore}
              <Link
                href={"/cgv-artisans" as Route}
                target="_blank"
                className={`rounded-sm font-semibold text-primary-strong underline ${focusRing}`}
              >
                {c.cgvLink}
              </Link>
              {c.cgvAfter}
            </span>
          </label>
        </div>
        <p className="text-sm text-label">{c.refused}</p>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Button type="submit" size="lg" disabled={pending || !plan}>
          <CreditCard aria-hidden="true" className="size-5" />
          {c.submit}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[0.8125rem] text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          {c.secure}
        </p>
      </div>
    </form>
  );
}

export function ManageSubscription() {
  const [state, action, pending] = useActionState<FormState>(openBillingPortal, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" variant="secondary" block={false} disabled={pending}>
        <CreditCard aria-hidden="true" className="size-4" />
        {t.manage}
      </Button>
    </form>
  );
}
