"use client";

import { subscriptionPayback } from "@menao/core";
import { useId, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.calculator;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type Plan = { code: string; nom: string; monthlyCents: number; recommandee: boolean };

/**
 * Calculateur de rentabilité de /pro/formules (ADR 0265) : la marge d'un chantier moyen comparée
 * au prix mensuel de la formule (calcul dans @menao/core). Aucune promesse de volume de demandes.
 * TODO(legal) : faire relire le libellé et la note.
 */
export function PaybackCalculator({ id, plans }: { id: string; plans: readonly Plan[] }) {
  const [code, setCode] = useState(
    () => plans.find((plan) => plan.recommandee)?.code ?? plans[0]?.code ?? "",
  );
  const [job, setJob] = useState(4500);
  const [margin, setMargin] = useState(25);
  const ids = useId();
  const plan = plans.find((p) => p.code === code) ?? plans[0];
  if (!plan) return null;
  const result = subscriptionPayback(plan.monthlyCents, job * 100, margin);

  return (
    <section
      aria-labelledby={id}
      className="mx-auto grid max-w-6xl gap-8 rounded-hero border border-border bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_32rem] lg:items-center lg:gap-12"
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-primary-strong uppercase">
          {t.eyebrow}
        </p>
        <h2
          id={id}
          className="text-[1.75rem] leading-[1.08] font-bold tracking-tight text-balance sm:text-[2.25rem]"
        >
          {t.title}
        </h2>
        <p className="text-pretty text-label">{t.text}</p>
      </div>
      <div className="flex flex-col gap-5">
        <div
          role="group"
          aria-label={t.plan}
          className="grid grid-cols-3 gap-1 rounded-pill border border-border bg-background p-1"
        >
          {plans.map((p) => (
            <button
              key={p.code}
              type="button"
              aria-pressed={p.code === plan.code}
              onClick={() => setCode(p.code)}
              className="min-h-10 rounded-pill text-sm font-semibold text-foreground transition-colors aria-pressed:bg-foreground aria-pressed:text-surface"
            >
              {p.nom}
            </button>
          ))}
        </div>
        <Slider
          id={`${ids}-job`}
          label={t.job}
          value={job}
          display={`${euros.format(job)} HT`}
          min={1000}
          max={20000}
          step={500}
          onChange={setJob}
        />
        <Slider
          id={`${ids}-margin`}
          label={t.margin}
          value={margin}
          display={`${margin} %`}
          min={10}
          max={50}
          step={5}
          onChange={setMargin}
        />
        {result && (
          <div aria-live="polite" className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-2xl bg-primary-soft p-4">
              <span className="text-xs font-bold tracking-[0.06em] text-primary-strong uppercase">
                {t.marginPerJob}
              </span>
              <span className="font-display text-[1.75rem] leading-tight font-bold">
                {euros.format(result.marginCents / 100)}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-foreground p-4 text-white">
              <span className="text-xs font-bold tracking-[0.06em] text-[#9fb1ef] uppercase">
                {t.paidBy(plan.nom)}
              </span>
              <span className="font-display text-[1.375rem] leading-tight font-bold sm:text-[1.5rem]">
                {result.kind === "every" ? t.every(result.months) : t.perMonth(result.jobs)}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t.note}</p>
      </div>
    </section>
  );
}

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex justify-between gap-3 text-sm font-semibold">
        {label}
        <output htmlFor={id} className="font-bold tabular-nums">
          {display}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}
