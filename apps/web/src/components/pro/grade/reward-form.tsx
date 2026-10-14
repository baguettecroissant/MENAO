"use client";

import { REWARD_SIZES } from "@menao/core";
import { startTransition, useActionState } from "react";
import { Alert, Button, Field, FieldError } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { claimReward } from "@/lib/artisan/grade-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.grade.reward;

export type DeliveryDefaults = {
  firstName: string | null;
  address: string;
  city: string;
  phone: string;
};

/**
 * « Réclamez votre récompense » (F-24, maquette) : tailles de la veste et du pantalon, adresse de
 * livraison pré-remplie avec celle de l'entreprise, téléphone ; la demande part à l'équipe MENAO.
 */
export function RewardForm({ level, defaults }: { level: number; defaults: DeliveryDefaults }) {
  const [state, formAction, pending] = useActionState(
    claimReward.bind(null, level),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <p className="text-center text-sm font-medium text-primary-strong">{t.sizesTitle}</p>
      <SizeField
        name="jacket_size"
        legend={t.jacket}
        value={state.values?.jacket_size}
        error={errors.jacket_size?.[0]}
      />
      <SizeField
        name="pants_size"
        legend={t.pants}
        value={state.values?.pants_size}
        error={errors.pants_size?.[0]}
      />
      <p className="pt-1 text-sm font-medium">{t.delivery}</p>
      <Field
        label={t.address}
        name="address"
        autoComplete="street-address"
        defaultValue={state.values?.address ?? defaults.address}
        errors={errors.address}
      />
      <Field
        label={t.city}
        name="city"
        defaultValue={state.values?.city ?? defaults.city}
        errors={errors.city}
      />
      <Field
        label={t.country}
        name="country"
        defaultValue={state.values?.country ?? t.countryDefault}
        errors={errors.country}
      />
      <Field
        label={t.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={state.values?.phone ?? defaults.phone}
        errors={errors.phone}
      />
      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.note}</p>
    </form>
  );
}

function SizeField({
  name,
  legend,
  value,
  error,
}: {
  name: string;
  legend: string;
  value?: string;
  error?: string;
}) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="pb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-5 gap-2">
        {REWARD_SIZES.map((size) => (
          <label key={size} className="relative">
            <input
              type="radio"
              name={name}
              value={size}
              defaultChecked={value === size}
              className="peer sr-only"
            />
            <span className="flex min-h-10 cursor-pointer items-center justify-center rounded-input border border-border bg-surface text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-strong peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background">
              {size}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
    </fieldset>
  );
}
