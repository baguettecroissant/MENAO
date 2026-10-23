"use client";

import { BUDGET_MINIMUM_OPTIONS, DIPLOMES_METIER } from "@menao/core";
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
}) {
  const [state, action, pending] = useActionState(saveTrades, initialFormState);
  const [selected, setSelected] = useState(new Set(props.selectedTrades));
  const errors = state.fieldErrors ?? {};

  function toggle(code: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.tradeCodes ? "trades-error" : undefined}
      >
        <legend className="text-lg font-medium">{t.legend}</legend>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {props.trades.map((trade) => (
            <div key={trade.code} className="rounded-button border border-border p-3">
              <CheckboxField
                name="trade"
                id={`trade-${trade.code}`}
                value={trade.code}
                checked={selected.has(trade.code)}
                onChange={(e) => toggle(trade.code, e.target.checked)}
              >
                <span className="font-medium">{trade.label}</span>
              </CheckboxField>
              {selected.has(trade.code) && trade.workTypes.length > 0 && (
                <fieldset className="mt-2 ml-8 flex flex-col gap-1">
                  <legend className="sr-only">
                    {t.specialties} — {trade.label}
                  </legend>
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
                </fieldset>
              )}
            </div>
          ))}
        </div>
        {errors.tradeCodes && (
          <p id="trades-error" className="text-sm text-danger">
            {errors.tradeCodes[0]}
          </p>
        )}
      </fieldset>
      <div className="max-w-48">
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
      </div>
      <div className="max-w-sm">
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
      <div className="max-w-sm">
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
      <Button type="submit" disabled={pending}>
        {fr.pro.onboarding.saveAndContinue}
      </Button>
    </form>
  );
}
