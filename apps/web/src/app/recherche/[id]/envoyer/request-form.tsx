"use client";

import { Clock, Plus, Send } from "lucide-react";
import { useActionState, useState } from "react";
import { PhoneField } from "@/components/form-fields";
import {
  Alert,
  Button,
  Card,
  CardTitle,
  Field,
  FieldError,
  RadioGroup,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { sendRequest, type RequestContext } from "@/lib/project/request-actions";

const t = fr.search.request;

/** F-11, maquette « Envoyez votre demande de chantier » : message, coordonnées, rappel. */
export function RequestForm({
  context,
  names,
  email,
  phone,
  defaultMessage = null,
}: {
  context: RequestContext;
  names: string;
  email: string;
  phone: string | null;
  /** Message déjà écrit pour un autre métier du même chantier (ADR 0168), repris. */
  defaultMessage?: string | null;
}) {
  const [state, action, pending] = useActionState(
    sendRequest.bind(null, context),
    initialFormState,
  );
  const [mode, setMode] = useState(state.values?.callbackMode ?? "des_que_possible");
  const [withMessage, setWithMessage] = useState(Boolean(state.values?.message ?? defaultMessage));
  const [message, setMessage] = useState(state.values?.message ?? defaultMessage ?? "");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.messageTitle} description={t.messageIntro(names)} />
        {!withMessage ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              block={false}
              onClick={() => setWithMessage(true)}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.messageAdd}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-sm font-medium">
              {t.message}
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              maxLength={10_000}
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={errors.message ? true : undefined}
              className={`${inputClasses} min-h-36 py-3 leading-relaxed`}
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setWithMessage(false);
                  setMessage("");
                }}
                className="text-xs font-medium text-primary-strong hover:underline"
              >
                {t.messageRemove}
              </button>
              <span className="text-xs text-muted-foreground">
                {t.messageCount(message.length)}
              </span>
            </div>
            {errors.message && <FieldError>{errors.message[0]}</FieldError>}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.contactTitle} description={t.contactIntro} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contact-email" label={t.email} name="emailDisplay" value={email} readOnly />
          <PhoneField
            id="contact-phone"
            label={t.phone}
            name="phone"
            required
            placeholder="6 00 00 00 00"
            defaultValue={state.values?.phone ?? (phone ? phone.replace(/^\+33/, "0") : "")}
            errors={errors.phone}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.callbackTitle} description={t.callbackIntro(names)} />
        <RadioGroup
          legend={t.callback}
          hideLegend
          name="callbackMode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "des_que_possible", label: t.callbackAsap },
            { value: "plage", label: t.callbackRange },
          ]}
          renderSelected={(value) =>
            value === "plage" ? (
              <div className="grid grid-cols-2 gap-4">
                <TimeField
                  id="callbackFrom"
                  label={t.from}
                  defaultValue={state.values?.callbackFrom}
                  errors={errors.callbackFrom}
                />
                <TimeField
                  id="callbackTo"
                  label={t.to}
                  defaultValue={state.values?.callbackTo}
                  errors={errors.callbackTo}
                />
              </div>
            ) : null
          }
        />
      </Card>

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button
          type="submit"
          size="lg"
          block={false}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {t.submit(context.artisanIds.length)}
          <Send aria-hidden="true" className="size-4" />
        </Button>
        <p className="text-xs text-muted-foreground">{t.deadline}</p>
      </div>
    </form>
  );
}

function TimeField({
  id,
  label,
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  errors?: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Clock
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          name={id}
          type="time"
          defaultValue={defaultValue}
          aria-invalid={errors?.length ? true : undefined}
          className={`${inputClasses} bg-surface pl-11`}
        />
      </div>
      {errors?.length ? <FieldError>{errors[0]}</FieldError> : null}
    </div>
  );
}
