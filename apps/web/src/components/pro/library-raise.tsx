"use client";

import {
  RAISE_ROUNDINGS,
  type RaiseRounding,
  formatRaise,
  parseRaise,
  raisePlan,
} from "@menao/core";
import { Check, CircleHelp } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { raisePrices } from "@/lib/artisan/library-raise-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.raise;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const PREVIEW = 5;

/** Prix affiché avec son unité (« 68,00 € / m² »), sans unité pour la pièce ou le forfait. */
const price = (cents: number, unit: string) =>
  t.perUnit(
    euros.format(cents / 100),
    unit === "u" || unit === "forfait" ? "" : (units[unit] ?? unit),
  );

export type RaiseWork = {
  id: string;
  designation: string;
  unit: string;
  manualPriceCents: number | null;
};
export type RaiseSupply = {
  id: string;
  designation: string;
  unit: string;
  purchasePriceCents: number | null;
};

/** Case « Sur quoi ? » : carte cochée bordée de bleu nuit (maquette). */
function ScopeCard({
  name,
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex flex-1 cursor-pointer items-start gap-3 rounded-input bg-surface px-3.5 py-[0.8125rem] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
        checked ? "border-2 border-foreground" : "border border-border"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong bg-surface text-surface peer-checked:border-foreground peer-checked:bg-foreground"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span className="flex flex-col gap-0.5">
        <b className="text-[0.90625rem]">{title}</b>
        <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Augmenter ses prix en un geste (F-149, ADR 0312, maquette lot 43) : pourcentage, ouvrages à prix
 * fixé et/ou prix d'achat, arrondi, aperçu avant/après calculé par packages/core.
 */
export function LibraryRaise({ works, supplies }: { works: RaiseWork[]; supplies: RaiseSupply[] }) {
  const [state, formAction, pending] = useActionState(raisePrices, initialFormState);
  const fixedWorks = works.filter((w) => w.manualPriceCents !== null).length;
  const pricedSupplies = supplies.filter((s) => s.purchasePriceCents !== null).length;
  const [rate, setRate] = useState(formatRaise(300));
  const [onWorks, setOnWorks] = useState(fixedWorks > 0);
  const [onSupplies, setOnSupplies] = useState(fixedWorks === 0 && pricedSupplies > 0);
  const [rounding, setRounding] = useState<RaiseRounding>("dix");
  const bp = parseRaise(rate);
  const plan =
    bp === null
      ? []
      : raisePlan(works, supplies, bp, rounding, { works: onWorks, supplies: onSupplies });
  const nWorks = plan.filter((i) => i.kind === "ouvrage").length;
  const nSupplies = plan.length - nWorks;
  const column =
    onWorks && onSupplies ? t.columns.item : onSupplies ? t.columns.supply : t.columns.work;

  return (
    <form action={formAction} className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-[1.125rem]">
        <section className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-6">
          <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-[12.5rem] flex-col gap-1.5">
              <span className="text-[0.84375rem] font-semibold text-label">{t.rate}</span>
              <input
                name="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                aria-invalid={bp === null}
                aria-describedby="hausse-aide"
                className={inputClasses}
              />
            </label>
            <div className="flex gap-2 pb-1">
              {t.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRate(formatRaise(p))}
                  aria-pressed={bp === p}
                  className="inline-flex h-9 items-center rounded-pill border border-border bg-surface px-3 text-[0.84375rem] font-semibold aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-surface"
                >
                  {formatRaise(p)}
                </button>
              ))}
            </div>
          </div>
          {bp === null && (
            <p id="hausse-aide" className="text-[0.8125rem] text-danger">
              {t.rateHint}
            </p>
          )}
          <span className="text-[0.84375rem] font-semibold text-label">{t.scope}</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ScopeCard
              name="works"
              title={t.works}
              hint={t.worksHint(fixedWorks)}
              checked={onWorks}
              disabled={fixedWorks === 0}
              onChange={() => setOnWorks((v) => !v)}
            />
            <ScopeCard
              name="supplies"
              title={t.supplies}
              hint={t.suppliesHint(pricedSupplies)}
              checked={onSupplies}
              disabled={pricedSupplies === 0}
              onChange={() => setOnSupplies((v) => !v)}
            />
          </div>
          <span className="text-[0.84375rem] font-semibold text-label">{t.rounding}</span>
          <div
            role="radiogroup"
            aria-label={t.rounding}
            className="flex self-start rounded-pill border border-border bg-surface p-1"
          >
            {RAISE_ROUNDINGS.map((r) => (
              <label
                key={r}
                className="flex min-h-10 cursor-pointer items-center rounded-pill px-4 text-[0.9375rem] font-medium whitespace-nowrap has-[:checked]:bg-foreground has-[:checked]:font-semibold has-[:checked]:text-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
              >
                <input
                  type="radio"
                  name="rounding"
                  value={r}
                  checked={rounding === r}
                  onChange={() => setRounding(r)}
                  className="sr-only"
                />
                {t.roundings[r]}
              </label>
            ))}
          </div>
          <p className="flex items-start gap-2 text-[0.84375rem] leading-normal text-muted-foreground">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-[0.9375rem] shrink-0" />
            {t.note}
          </p>
        </section>

        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between gap-2 p-4">
            <h2 className="text-[1.0625rem] font-bold tracking-tight">{t.preview}</h2>
            {plan.length > 0 && (
              <span className="text-[0.8125rem] text-muted-foreground">
                {t.previewCount(Math.min(PREVIEW, plan.length), plan.length)}
              </span>
            )}
          </div>
          {plan.length === 0 ? (
            <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
              {t.nothing}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-bold">
                    {column}
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right font-bold">
                    {t.columns.before}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">
                    {t.columns.after}
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.slice(0, PREVIEW).map((i) => (
                  <tr key={`${i.kind}-${i.id}`} className="border-t border-border">
                    <td className="px-4 py-[0.6875rem]">{i.designation}</td>
                    <td className="px-2 py-[0.6875rem] text-right whitespace-nowrap text-muted-foreground tabular-nums">
                      {price(i.beforeCents, i.unit)}
                    </td>
                    <td className="px-4 py-[0.6875rem] text-right font-bold whitespace-nowrap tabular-nums">
                      {price(i.afterCents, i.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5 lg:sticky lg:top-6">
        <h2 className="text-base font-bold tracking-tight">
          {bp !== null && plan.length > 0
            ? t.summary(formatRaise(bp), nWorks, nSupplies)
            : t.summaryEmpty}
        </h2>
        <p className="text-[0.84375rem] leading-[1.45] text-muted-foreground">{t.summaryText}</p>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Button
          type="submit"
          disabled={pending || bp === null || plan.length === 0}
          className="!min-h-12 !rounded-pill"
        >
          {t.apply}
        </Button>
        <p className="text-center text-[0.78125rem] text-muted-foreground">{t.undoNote}</p>
      </section>
    </form>
  );
}
