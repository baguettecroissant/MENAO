"use client";

import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { useActionState } from "react";
import { Alert, Button, CheckboxField, Field, TextLink } from "@/components/ui";
import { PasswordField } from "@/components/form-fields";
import { fr } from "@/i18n/fr";
import { signUpArtisan } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function ArtisanSignUpForm() {
  const [state, action, pending] = useActionState(signUpArtisan, initialFormState);
  const errors = state.fieldErrors ?? {};
  const t = fr.signUp;
  const p = fr.pro.signUp;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.firstName}
          name="firstName"
          autoComplete="given-name"
          required
          defaultValue={state.values?.firstName}
          errors={errors.firstName}
        />
        <Field
          label={t.lastName}
          name="lastName"
          autoComplete="family-name"
          required
          defaultValue={state.values?.lastName}
          errors={errors.lastName}
        />
      </div>
      <Field
        label={p.siret}
        name="siret"
        inputMode="numeric"
        autoComplete="off"
        required
        hint={p.siretHint}
        defaultValue={state.values?.siret}
        errors={errors.siret}
      />
      <Field
        label={p.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
        required
        hint={t.phoneHint}
        defaultValue={state.values?.phone}
        errors={errors.phone}
      />
      <Field
        label={t.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <PasswordField
        label={t.password}
        name="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={t.passwordHint}
        errors={errors.password}
      />

      <CheckboxField name="acceptTerms" required errors={errors.acceptTerms}>
        {t.acceptTermsBefore}
        <TextLink href="/cgu" target="_blank">
          {t.terms}
        </TextLink>
        {t.acceptTermsMiddle}
        <TextLink href="/confidentialite" target="_blank">
          {t.privacy}
        </TextLink>
        .
      </CheckboxField>
      <CheckboxField name="acceptCgv" required errors={errors.acceptCgv}>
        {p.acceptCgvBefore}
        <TextLink href="/cgv-artisans" target="_blank">
          {p.cgv}
        </TextLink>
        .
      </CheckboxField>
      <CheckboxField name="marketingOptIn">{t.marketing}</CheckboxField>

      <Button type="submit" disabled={pending}>
        {p.submit}
      </Button>
    </form>
  );
}
