"use client";

import { commissionComparison } from "@menao/core";
import { useId, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.commission.calculator;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * « Ce que vous coûterait une commission » : montant mensuel de chantiers et taux choisis par
 * l'artisan, comparés à l'abonnement Base (calcul : commissionComparison, @menao/core).
 */
export function CommissionCalculator({ subscriptionCents }: { subscriptionCents: number }) {
  const id = useId();
  const [revenue, setRevenue] = useState(8000);
  const [rate, setRate] = useState(15);
  const { commissionCents, monthlySavingCents, yearlySavingCents } = commissionComparison({
    monthlyRevenueCents: revenue * 100,
    commissionRateBp: rate * 100,
    subscriptionCents,
  });
  const max = Math.max(commissionCents, subscriptionCents, 1);

  return (
    <div className="flex flex-col gap-6 rounded-hero bg-surface p-6 text-foreground shadow-raised sm:p-8">
      <h3 className="text-lg font-medium">{t.title}</h3>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${id}-revenue`} className="text-sm text-muted-foreground">
            {t.revenue}
          </label>
          <output htmlFor={`${id}-revenue`} className="shrink-0 text-lg font-medium tabular-nums">
            {euros.format(revenue)}
          </output>
        </div>
        <input
          id={`${id}-revenue`}
          type="range"
          min={1000}
          max={50000}
          step={500}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${id}-rate`} className="text-sm text-muted-foreground">
            {t.rate}
          </label>
          <output htmlFor={`${id}-rate`} className="shrink-0 text-lg font-medium tabular-nums">
            {rate}&nbsp;%
          </output>
        </div>
        <input
          id={`${id}-rate`}
          type="range"
          min={5}
          max={25}
          step={1}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
        />
      </div>
      <dl className="flex flex-col gap-4 border-t border-border pt-5">
        {[
          {
            label: t.commission,
            cents: commissionCents,
            bar: "bg-danger/80",
            value: "text-danger",
          },
          {
            label: t.menao,
            cents: subscriptionCents,
            bar: "bg-primary",
            value: "text-primary-strong",
          },
        ].map((row) => (
          // Un groupe = dt + dd (HTML : seuls dt et dd sont admis dans le div d'un dl).
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5"
          >
            <dt className="text-sm">{row.label}</dt>
            <dd
              className={`shrink-0 text-xl font-medium whitespace-nowrap tabular-nums ${row.value}`}
            >
              {euros.format(row.cents / 100)}{" "}
              <span className="text-xs font-normal text-muted-foreground">{t.perMonth}</span>
            </dd>
            <dd aria-hidden="true" className="col-span-2 h-2 rounded-full bg-background">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${row.bar}`}
                style={{ width: `${Math.max(2, (row.cents / max) * 100)}%` }}
              />
            </dd>
          </div>
        ))}
      </dl>
      <p
        aria-live="polite"
        className={`rounded-input px-4 py-3 text-sm font-medium ${
          monthlySavingCents > 0
            ? "bg-success-soft text-success"
            : "bg-background text-muted-foreground"
        }`}
      >
        {monthlySavingCents > 0
          ? t.saving(euros.format(monthlySavingCents / 100), euros.format(yearlySavingCents / 100))
          : t.noSaving}
      </p>
      <p className="text-xs text-muted-foreground">{t.note}</p>
    </div>
  );
}
