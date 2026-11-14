"use client";

import { BUDGET_MINIMUM_OPTIONS, DIPLOMES_METIER } from "@menao/core";
import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, CheckboxField, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveTrades } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.trades;

type Trade = { code: string; label: string; workTypes: { code: string; label: string }[] };

export function TradesForm(props: {
  trades: Trade[];
  selectedTrades: string[];
  selectedWorkTypes: string[];
  experienceYears: number | null;
  /** Diplôme du métier déclaré (Score MENAO, ADR 0155). */
  diploma: string | null;
  /** Budget minimum des demandes (ADR 0164). */
  budgetMinimum: string | null;
  /** Limite de métiers de la formule (ADR 0290) ; null : illimité. */
  maxTrades: number | null;
}) {
  const [state, action, pending] = useActionState(saveTrades, initialFormState);
  const [selected, setSelected] = useState(new Set(props.selectedTrades));
  const errors = state.fieldErrors ?? {};
  // Au-delà de la limite, on ne peut que retirer ou recocher un métier déjà enregistré (ADR 0290).
  const original = new Set(props.selectedTrades);
  const full = props.maxTrades !== null && selected.size >= props.maxTrades;

  function toggle(code: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.tradeCodes ? "trades-error" : undefined}
      >
        <legend className="text-[1.0625rem] font-bold tracking-tight">{t.legend}</legend>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
        {props.maxTrades !== null && (
          <p className="text-sm text-label" role="note">
            {t.limit(props.maxTrades)}{" "}
            <Link
              href="/pro/onboarding/formule"
              className="font-semibold text-primary-strong underline-offset-2 hover:underline"
            >
              {t.limitLink}
            </Link>
          </p>
        )}
        {/* Refonte « Nette » (lot 47, ADR 0316) : métiers en pastilles, spécialités dessous. */}
        <div className="flex flex-wrap gap-2">
          {props.trades.map((trade) => {
            const disabled = full && !selected.has(trade.code) && !original.has(trade.code);
            return (
              <label
                key={trade.code}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-pill border px-3.5 text-[0.90625rem] font-semibold transition-colors has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } border-border-strong bg-surface`}
              >
                <input
                  type="checkbox"
                  name="trade"
                  id={`trade-${trade.code}`}
                  value={trade.code}
                  checked={selected.has(trade.code)}
                  disabled={disabled}
                  onChange={(e) => toggle(trade.code, e.target.checked)}
                  className="peer sr-only"
                />
                <Check
                  aria-hidden="true"
                  className="hidden size-3.5 peer-checked:block"
                  strokeWidth={2.6}
                />
                {trade.label}
              </label>
            );
          })}
        </div>
        {props.trades
          .filter((trade) => selected.has(trade.code) && trade.workTypes.length > 0)
          .map((trade) => (
            <fieldset
              key={trade.code}
              className="flex flex-col gap-2.5 rounded-input bg-background p-3.5"
            >
              <legend className="sr-only">
                {t.specialties} — {trade.label}
              </legend>
              <p aria-hidden="true" className="text-[0.90625rem] font-semibold">
                {trade.label} · {t.specialties.toLowerCase()}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {trade.workTypes.map((w) => (
                  <CheckboxField
                    key={w.code}
                    name="workType"
                    id={`work-${w.code}`}
                    value={w.code}
                    defaultChecked={props.selectedWorkTypes.includes(w.code)}
                  >
                    {w.label}
                  </CheckboxField>
                ))}
              </div>
            </fieldset>
          ))}
        {errors.tradeCodes && (
          <p id="trades-error" className="text-sm text-danger">
            {errors.tradeCodes[0]}
          </p>
        )}
      </fieldset>
      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <Field
          label={t.experience}
          name="experienceYears"
          type="number"
          inputMode="numeric"
          min={0}
          max={80}
          required
          defaultValue={props.experienceYears ?? ""}
          errors={errors.experienceYears}
        />
        <SelectField
          label={t.diploma}
          name="diploma"
          defaultValue={props.diploma ?? ""}
          hint={t.diplomaHint}
          errors={errors.diploma}
        >
          <option value="">{t.diplomaNone}</option>
          {DIPLOMES_METIER.map((d) => (
            <option key={d} value={d}>
              {fr.diplomesMetier[d]}
            </option>
          ))}
        </SelectField>
      </div>
      <div>
        <SelectField
          label={t.budgetMinimum}
          name="budgetMinimum"
          defaultValue={props.budgetMinimum ?? ""}
          hint={t.budgetMinimumHint}
          errors={errors.budgetMinimum}
        >
          <option value="">{t.budgetMinimumAll}</option>
          {BUDGET_MINIMUM_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {t.budgetMinimumOptions[b]}
            </option>
          ))}
        </SelectField>
      </div>
      <Button type="submit" disabled={pending} className="!min-h-12 !rounded-pill">
        {fr.pro.onboarding.saveAndContinue}
      </Button>
    </form>
  );
}
