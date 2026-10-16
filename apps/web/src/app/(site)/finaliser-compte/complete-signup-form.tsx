"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxField, Field, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { completeSignup } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

const s = fr.signUp;

/** Nom, téléphone facultatif, CGU et newsletters : comme l'inscription, sans adresse ni mot de passe. */
export function CompleteSignupForm({
  next,
  firstName,
  lastName,
}: {
  next: string | null;
  firstName: string;
  lastName: string;
}) {
  const [state, action, pending] = useActionState(
    completeSignup.bind(null, next),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.firstName}
          name="firstName"
          autoComplete="given-name"
          required
          defaultValue={state.values?.firstName ?? firstName}
          errors={errors.firstName}
        />
        <Field
          label={s.lastName}
          name="lastName"
          autoComplete="family-name"
          required
          defaultValue={state.values?.lastName ?? lastName}
          errors={errors.lastName}
        />
      </div>
      <Field
        label={s.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
        hint={s.phoneHint}
        defaultValue={state.values?.phone}
        errors={errors.phone}
      />
      <CheckboxField name="acceptTerms" required errors={errors.acceptTerms}>
        {s.acceptTermsBefore}
        <TextLink href="/cgu" target="_blank">
          {s.terms}
        </TextLink>
        {s.acceptTermsMiddle}
        <TextLink href="/confidentialite" target="_blank">
          {s.privacy}
        </TextLink>
        .
      </CheckboxField>
      <CheckboxField name="marketingOptIn">{s.marketing}</CheckboxField>
      <Button type="submit" disabled={pending}>
        {fr.completeSignup.submit}
      </Button>
    </form>
  );
}
