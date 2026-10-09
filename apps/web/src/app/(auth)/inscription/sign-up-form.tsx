"use client";

import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { useActionState } from "react";
import { Alert, Button, Field, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signUp } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialFormState);
  const errors = state.fieldErrors ?? {};
  const t = fr.signUp;

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
        label={t.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
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
      <Field
        label={t.password}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={t.passwordHint}
        errors={errors.password}
      />

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-1 size-5 accent-primary"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
          />
          <span>
            {t.acceptTermsBefore}
            <TextLink href="/cgu" target="_blank">
              {t.terms}
            </TextLink>
            {t.acceptTermsMiddle}
            <TextLink href="/confidentialite" target="_blank">
              {t.privacy}
            </TextLink>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm text-danger">
            {errors.acceptTerms[0]}
          </p>
        )}
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="marketingOptIn" className="mt-1 size-5 accent-primary" />
        <span>{t.marketing}</span>
      </label>

      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
