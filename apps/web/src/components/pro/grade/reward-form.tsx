"use client";

import { Gift } from "lucide-react";
import { startTransition, useActionState } from "react";
import { AddressSummary, SizePills } from "@/components/pro/gift-kit";
import { Alert, Button, Field } from "@/components/ui";
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
 * « Réclamez votre récompense » (F-24 ; maquette du lot 37) : tailles de la veste et du pantalon
 * en pastilles, adresse de l'entreprise en résumé (modifiable), téléphone ; la demande part à
 * l'équipe MENAO.
 */
export function RewardForm({ level, defaults }: { level: number; defaults: DeliveryDefaults }) {
  const [state, formAction, pending] = useActionState(
    claimReward.bind(null, level),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  const addressError = Boolean(errors.address || errors.city || errors.country);
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
      <div className="grid gap-4 md:grid-cols-2">
        <SizePills
          name="jacket_size"
          legend={t.jacket}
          value={state.values?.jacket_size}
          error={errors.jacket_size?.[0]}
        />
        <SizePills
          name="pants_size"
          legend={t.pants}
          value={state.values?.pants_size}
          error={errors.pants_size?.[0]}
        />
      </div>
      <AddressSummary
        title={t.delivery}
        lines={[defaults.address || null, defaults.city || null]}
        hint={t.companyAddress}
        editLabel={t.editAddress}
        open={addressError}
      >
        <Field
          label={t.address}
          name="address"
          autoComplete="street-address"
          defaultValue={state.values?.address ?? defaults.address}
          errors={errors.address}
        />
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </AddressSummary>
      <div className="sm:max-w-xs">
        <Field
          label={t.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={state.values?.phone ?? defaults.phone}
          errors={errors.phone}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending} block={false} className="sm:self-start">
          <Gift aria-hidden="true" className="size-4" />
          {t.submit}
        </Button>
        <p className="text-[0.8125rem] text-muted-foreground">{t.note}</p>
      </div>
    </form>
  );
}
