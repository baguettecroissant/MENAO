"use client";

import { type ConnectTokenPrefill, completeConnectPrefill, type ConnectDetails } from "@menao/core";
import { connectDetailsSchema } from "@menao/validation";
import { type FormEvent, useState, useTransition } from "react";
import { z } from "zod";
import { Alert, Button, CheckboxField, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createConnectAccount } from "@/lib/artisan/actions";
import { createConnectTokens } from "@/lib/artisan/connect-tokens";
import { CONNECT_STRIPE_PATH } from "./stripe-link";

const t = fr.pro.onboarding.connect;

type Errors = Record<string, string[] | undefined>;

/**
 * Premier passage à l'étape Paiements (ADR 0215) : l'artisan saisit dans MENAO ce que Stripe
 * demanderait encore (date de naissance, adresse personnelle, IBAN, associé unique). Ces données
 * partent directement chez Stripe dans des jetons créés par le navigateur ; le compte est créé
 * pré-rempli, puis le formulaire Stripe intégré s'ouvre. Sans clé publique, un simple bouton.
 */
export function ConnectPrepareForm({
  prefill,
  today,
}: {
  prefill: ConnectTokenPrefill | null;
  /** Date du jour (AAAA-MM-JJ, heure de Paris). */
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sameAddress, setSameAddress] = useState(false);
  const personal = prefill?.person != null || prefill?.account?.business_type === "individual";
  const businessAddress = prefill?.businessAddress ?? null;
  const askSoleOwner = prefill?.person != null && prefill.soleOwnerDefault != null;

  /** Crée les jetons (si possible), puis le compte, puis ouvre le formulaire Stripe intégré. */
  function open(details: ConnectDetails | null) {
    startTransition(async () => {
      const tokens = prefill
        ? await createConnectTokens(
            prefill.publishableKey,
            completeConnectPrefill(prefill, details ?? {}),
          )
        : {};
      const result = await createConnectAccount(tokens);
      if (result.error) setError(result.error);
      else window.location.assign(CONNECT_STRIPE_PATH);
    });
  }

  if (!prefill) {
    return (
      <div className="flex flex-col gap-2">
        {error && <Alert tone="error">{error}</Alert>}
        <Button
          type="button"
          disabled={pending}
          onClick={() => open(null)}
          className="sm:w-auto sm:self-start sm:px-6"
        >
          {t.start}
        </Button>
      </div>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const parsed = connectDetailsSchema({ personal, today, businessAddress }).safeParse({
      birthDate: value("birthDate"),
      sameAddress,
      line1: value("line1"),
      postalCode: value("postalCode"),
      city: value("city"),
      iban: value("iban"),
      soleOwner: form.get("soleOwner") === "on",
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    open(parsed.data);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{t.prepare.title}</h3>
        <p className="text-sm text-muted-foreground">{t.prepare.intro}</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {personal && (
        <>
          <Field
            label={t.prepare.birthDate}
            name="birthDate"
            type="date"
            max={today}
            autoComplete="bday"
            required
            errors={errors.birthDate}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-medium">{t.prepare.homeAddress}</legend>
            {businessAddress && (
              <CheckboxField
                name="sameAddress"
                checked={sameAddress}
                onChange={(event) => setSameAddress(event.currentTarget.checked)}
              >
                {t.prepare.sameAddress}
              </CheckboxField>
            )}
            {!(sameAddress && businessAddress) && (
              <>
                <Field
                  label={t.prepare.line1}
                  name="line1"
                  autoComplete="street-address"
                  required
                  errors={errors.line1}
                />
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <Field
                    label={t.prepare.postalCode}
                    name="postalCode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    required
                    errors={errors.postalCode}
                  />
                  <Field
                    label={t.prepare.city}
                    name="city"
                    autoComplete="address-level2"
                    required
                    errors={errors.city}
                  />
                </div>
              </>
            )}
          </fieldset>
        </>
      )}
      {askSoleOwner && (
        <div className="flex flex-col gap-1">
          <CheckboxField name="soleOwner" defaultChecked={prefill.soleOwnerDefault === true}>
            {t.prepare.soleOwner}
          </CheckboxField>
          <p className="pl-[1.875rem] text-xs text-muted-foreground">{t.prepare.soleOwnerHint}</p>
        </div>
      )}
      <Field
        label={t.prepare.iban}
        name="iban"
        hint={t.prepare.ibanHint}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        errors={errors.iban}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending} className="sm:w-auto sm:px-6">
          {pending ? t.prepare.sending : t.prepare.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => open(null)}
          className="sm:w-auto"
        >
          {t.prepare.skip}
        </Button>
      </div>
    </form>
  );
}
