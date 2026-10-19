"use client";

import { useActionState } from "react";
import { Alert, Button, Field, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { applyAsPartner } from "@/lib/site/actions";

const t = fr.pages.partners;

/** Candidature au programme Partenaires (ADR 0139) : envoyée à l'équipe comme un ticket. */
export function PartnerApplicationForm() {
  const [state, action, pending] = useActionState(applyAsPartner, initialFormState);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.company}
          name="company"
          autoComplete="organization"
          maxLength={120}
          required
          defaultValue={v?.company}
          errors={errors.company}
        />
        <Field
          label={t.siret}
          name="siret"
          inputMode="numeric"
          maxLength={20}
          required
          defaultValue={v?.siret}
          errors={errors.siret}
        />
        <Field
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={v?.email}
          errors={errors.email}
        />
        <Field
          label={t.website}
          name="website"
          type="url"
          autoComplete="url"
          maxLength={200}
          defaultValue={v?.website}
          errors={errors.website}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="partenaire-message" className="text-sm font-medium">
          {t.message}
        </label>
        <textarea
          id="partenaire-message"
          name="message"
          rows={5}
          maxLength={1700}
          required
          defaultValue={v?.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "partenaire-message-erreur" : undefined}
          className={`${inputClasses} min-h-32 resize-y py-3`}
        />
        {errors.message?.[0] && (
          <FieldError id="partenaire-message-erreur">{errors.message[0]}</FieldError>
        )}
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {t.submit}
      </Button>
    </form>
  );
}
