"use client";

import { invoiceNumber } from "@menao/core";
import { useActionState, useState } from "react";
import { Alert, Button, Field, RadioGroup } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { saveCommercialBilling } from "@/lib/commercial/billing-actions";

const t = fr.commercialGains.billing;

export type BillingValues = {
  name: string;
  siret: string;
  address: string;
  vatMode: "franchise" | "assujetti";
  vatNumber: string;
  iban: string;
  prefix: string;
  number: number;
};

/**
 * Informations de facturation du conseiller (F-197, ADR 0397) : identité, TVA, IBAN et première
 * facture. La numérotation est figée après la première facture émise (`locked`).
 */
export function BillingForm({ initial, locked }: { initial: BillingValues; locked: boolean }) {
  const [state, action, pending] = useActionState(saveCommercialBilling, initialFormState);
  const v = (state.values ?? {}) as Partial<Record<string, string>>;
  const errors = state.fieldErrors ?? {};
  const [vatMode, setVatMode] = useState<string>(v.vatMode ?? initial.vatMode);
  const [prefix, setPrefix] = useState(v.prefix ?? initial.prefix);
  const [number, setNumber] = useState(v.number ?? String(initial.number));
  const example = invoiceNumber(prefix.toUpperCase(), Number(number) || 1);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field
        label={t.name}
        name="name"
        defaultValue={v.name ?? initial.name}
        errors={errors.name}
        autoComplete="name"
        maxLength={120}
        required
      />
      <Field
        label={t.siret}
        name="siret"
        hint={t.siretHint}
        defaultValue={v.siret ?? initial.siret}
        errors={errors.siret}
        inputMode="numeric"
        autoComplete="off"
        maxLength={20}
        required
      />
      <Field
        label={t.address}
        name="address"
        defaultValue={v.address ?? initial.address}
        errors={errors.address}
        autoComplete="street-address"
        maxLength={250}
        required
      />
      <div className="flex flex-col gap-2">
        <RadioGroup
          legend={t.vat}
          name="vatMode"
          value={vatMode}
          onChange={setVatMode}
          grid={2}
          options={[
            { value: "franchise", label: t.franchise },
            { value: "assujetti", label: t.assujetti },
          ]}
          renderSelected={(value) =>
            value === "assujetti" ? (
              <Field
                label={t.vatNumber}
                name="vatNumber"
                defaultValue={v.vatNumber ?? initial.vatNumber}
                errors={errors.vatNumber}
                autoComplete="off"
                maxLength={20}
              />
            ) : null
          }
        />
        <p className="text-[0.8125rem] text-muted-foreground">{t.vatHint}</p>
      </div>
      <Field
        label={t.iban}
        name="iban"
        hint={t.ibanHint}
        defaultValue={v.iban ?? initial.iban}
        errors={errors.iban}
        autoComplete="off"
        spellCheck={false}
        maxLength={42}
        required
      />
      {locked ? (
        <>
          <input type="hidden" name="prefix" value={initial.prefix} />
          <input type="hidden" name="number" value={initial.number} />
          <p className="text-sm text-label">
            {t.locked(invoiceNumber(initial.prefix, initial.number))}
          </p>
        </>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium in-[.app-nette]:font-semibold">
            {t.first}
          </legend>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <Field
              label={t.prefix}
              name="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              errors={errors.prefix}
              autoComplete="off"
              maxLength={20}
            />
            <Field
              label={t.number}
              name="number"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              errors={errors.number}
              inputMode="numeric"
              maxLength={6}
            />
          </div>
          <p className="text-[0.8125rem] text-muted-foreground">{t.firstHint(example)}</p>
        </fieldset>
      )}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Button type="submit" disabled={pending} data-demo-block="save">
        {t.save}
      </Button>
    </form>
  );
}
