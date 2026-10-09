"use client";

import { useActionState, useState } from "react";
import { SignUpForm } from "@/app/(auth)/inscription/sign-up-form";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import {
  signInForRequest,
  signUpForRequest,
  type RequestContext,
} from "@/lib/project/request-actions";

const t = fr.search.request;

/** F-08 : compte créé (ou connexion) au moment d'envoyer la demande ; le projet est conservé. */
export function AccountStep({ context }: { context: RequestContext }) {
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  return (
    <div className="flex flex-col gap-4">
      <div role="group" className="grid grid-cols-2 gap-2">
        {(["signup", "signin"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-touch rounded-button border px-3 font-medium ${
              tab === key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface"
            }`}
          >
            {key === "signup" ? t.tabSignUp : t.tabSignIn}
          </button>
        ))}
      </div>
      {tab === "signup" ? (
        <SignUpForm action={signUpForRequest.bind(null, context)} submitLabel={t.signUpSubmit} />
      ) : (
        <SignInStep context={context} />
      )}
    </div>
  );
}

function SignInStep({ context }: { context: RequestContext }) {
  const [state, action, pending] = useActionState(
    signInForRequest.bind(null, context),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        id="signin-email"
        label={fr.signIn.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <Field
        id="signin-password"
        label={fr.signIn.password}
        name="password"
        type="password"
        autoComplete="current-password"
        errors={errors.password}
      />
      <Button type="submit" disabled={pending}>
        {t.signInSubmit}
      </Button>
    </form>
  );
}
