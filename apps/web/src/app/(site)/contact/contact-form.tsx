"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { sendContactMessage } from "@/lib/site/actions";

const t = fr.pages.contact;

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, initialFormState);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={t.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        hint={t.privacy}
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <Field
        label={t.subject}
        name="subject"
        maxLength={150}
        defaultValue={state.values?.subject}
        errors={errors.subject}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="font-medium">
          {t.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={2000}
          required
          defaultValue={state.values?.message}
          aria-invalid={errors.message ? true : undefined}
          className="rounded-button border border-border bg-surface p-3"
        />
        {errors.message && <p className="text-sm text-danger">{errors.message[0]}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
