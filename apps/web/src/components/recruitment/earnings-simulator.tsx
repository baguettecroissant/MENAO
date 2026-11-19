"use client";

import {
  RECRUITMENT_SIMULATION_DEFAULT,
  RECRUITMENT_SIMULATION_MAX,
  clampSimulation,
  simulateRecruitmentEarnings,
  type PlanCode,
  type RecruitmentRates,
  type RecruitmentSimulation,
} from "@menao/core";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pages.recruitment.simulator;
const PLANS: readonly PlanCode[] = ["base", "premium", "entreprise"];
const PLAN_NAMES: Record<PlanCode, string> = {
  base: "Base",
  premium: "Premium",
  entreprise: "Entreprise",
};
const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

/**
 * Simulateur de gains (F-183, ADR 0380) : le calcul est celui de @menao/core, avec le barème réglé
 * dans le back-office (ou le barème annoncé tant que rien n'est réglé).
 */
export function EarningsSimulator({ rates }: { rates: RecruitmentRates }) {
  const [sim, setSim] = useState<RecruitmentSimulation>(RECRUITMENT_SIMULATION_DEFAULT);
  const { lines, totalCents } = simulateRecruitmentEarnings(sim, rates);
  const subscribed = PLANS.reduce((n, p) => n + sim.subscribers[p], 0);
  const update = (next: RecruitmentSimulation) => setSim(clampSimulation(next));
  const step = (plan: PlanCode, delta: number) =>
    update({ ...sim, subscribers: { ...sim.subscribers, [plan]: sim.subscribers[plan] + delta } });

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="flex flex-col gap-6 rounded-[1.375rem] border border-border bg-surface p-6 shadow-card sm:p-8">
        <label className="flex flex-col gap-3">
          <span className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-semibold">
            {t.validated}
            <output className="font-display text-xl font-bold">{sim.validated}</output>
          </span>
          <input
            type="range"
            min={0}
            max={RECRUITMENT_SIMULATION_MAX}
            value={sim.validated}
            onChange={(e) => update({ ...sim, validated: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[0.9375rem] font-semibold">{t.subscribers}</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const name = PLAN_NAMES[plan];
              const value = sim.subscribers[plan];
              return (
                <div
                  key={plan}
                  className="flex flex-col gap-2 rounded-2xl border border-border p-3.5"
                >
                  <span className="flex justify-between text-sm">
                    <b>{name}</b>
                    <span className="text-muted-foreground">
                      {euros(rates.subscriptionCents[plan])}
                    </span>
                  </span>
                  <span className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => step(plan, -1)}
                      disabled={value === 0}
                      aria-label={t.less(name)}
                      className={`flex size-9 items-center justify-center rounded-full border border-border-strong text-label disabled:opacity-40 ${focusRing}`}
                    >
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <output
                      aria-label={t.planLabel(name)}
                      className="font-display text-2xl font-bold"
                    >
                      {value}
                    </output>
                    <button
                      type="button"
                      onClick={() => step(plan, 1)}
                      disabled={subscribed >= sim.validated}
                      aria-label={t.more(name)}
                      className={`flex size-9 items-center justify-center rounded-full border border-border-strong text-label disabled:opacity-40 ${focusRing}`}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-[0.9375rem] text-label">
          {lines.map((line) => (
            <div key={line.kind} className="flex justify-between gap-4">
              <dt>
                {line.kind === "validation"
                  ? t.lineValidation(line.count, euros(line.unitCents))
                  : t.linePlan(line.count, PLAN_NAMES[line.kind], euros(line.unitCents))}
              </dt>
              <dd className="font-bold text-foreground">{euros(line.totalCents)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col justify-center gap-3 rounded-[1.375rem] bg-foreground p-6 text-white sm:p-8">
        <span className="text-sm font-semibold opacity-75">{t.example}</span>
        <output
          aria-live="polite"
          className="font-display text-[3.25rem] leading-none font-bold tracking-tight sm:text-6xl"
        >
          {euros(totalCents)}
        </output>
        <p className="text-sm leading-relaxed opacity-80">{t.disclaimer}</p>
      </div>
    </div>
  );
}
