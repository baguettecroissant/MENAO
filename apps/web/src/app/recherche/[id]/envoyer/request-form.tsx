"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, RadioGroup } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { sendRequest, type RequestContext } from "@/lib/project/request-actions";

const t = fr.search.request;

/** F-11 : message, coordonnées, préférence de rappel. */
export function RequestForm({
  context,
  email,
  phone,
}: {
  context: RequestContext;
  email: string;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState(
    sendRequest.bind(null, context),
    initialFormState,
  );
  const [mode, setMode] = useState(state.values?.callbackMode ?? "des_que_possible");
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="font-medium">
          {t.message}
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={10_000}
          defaultValue={state.values?.message}
          aria-describedby="message-hint"
          className="rounded-button border border-border bg-surface p-3"
        />
        <p id="message-hint" className="text-sm text-muted-foreground">
          {t.messageHint}
        </p>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{t.contact}</legend>
        <p className="text-sm text-muted-foreground">{t.contactHint}</p>
        <Field id="contact-email" label={t.email} name="emailDisplay" value={email} readOnly />
        <Field
          id="contact-phone"
          label={t.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={state.values?.phone ?? phone ?? ""}
          errors={errors.phone}
        />
      </fieldset>
      <RadioGroup
        legend={t.callback}
        name="callbackMode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "des_que_possible", label: t.callbackAsap },
          { value: "plage", label: t.callbackRange },
        ]}
      />
      {mode === "plage" && (
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="callbackFrom"
            label={t.from}
            name="callbackFrom"
            type="time"
            defaultValue={state.values?.callbackFrom}
            errors={errors.callbackFrom}
          />
          <Field
            id="callbackTo"
            label={t.to}
            name="callbackTo"
            type="time"
            defaultValue={state.values?.callbackTo}
            errors={errors.callbackTo}
          />
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t.deadline}</p>
      <Button type="submit" disabled={pending}>
        {t.submit(context.artisanIds.length)}
      </Button>
    </form>
  );
}
