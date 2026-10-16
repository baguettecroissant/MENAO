"use client";

import type { OAuthProvider } from "@menao/core";
import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Alert, Button, Card, CardTitle, CheckboxField, Field, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import {
  continueWithProviderForRequest,
  signInForRequest,
  signUpForRequest,
  type RequestContext,
} from "@/lib/project/request-actions";

const t = fr.search.request;
const s = fr.signUp;

/**
 * F-08 : compte créé (ou connexion) au moment d'envoyer la demande, maquettes « Dernière étape » :
 * « Informations personnelles », « Créer mon espace client Menao », puis « Vous avez déjà un espace ».
 * Au-dessus, « Continuer avec Google / Apple » (ADR 0108), pour un nouveau compte comme pour un
 * compte existant.
 */
export function AccountStep({
  context,
  providers,
}: {
  context: RequestContext;
  providers: readonly OAuthProvider[];
}) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [oauthState, oauthAction] = useActionState(
    continueWithProviderForRequest.bind(null, context),
    initialFormState,
  );
  return (
    <div className="flex flex-col gap-4">
      <OAuthButtons providers={providers} action={oauthAction} error={oauthState.error} />
      {mode === "signup" ? <SignUpStep context={context} /> : <SignInStep context={context} />}
      <div className="flex flex-col items-start justify-between gap-3 rounded-card border border-primary/25 bg-primary-softer p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">
            {mode === "signup" ? t.haveAccountTitle : t.spaceTitle}
          </p>
          {mode === "signup" && (
            <p className="text-sm text-muted-foreground">{t.haveAccountText}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          block={false}
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? t.haveAccountButton : t.backToSignUp}
        </Button>
      </div>
    </div>
  );
}

function SignUpStep({ context }: { context: RequestContext }) {
  const [state, action, pending] = useActionState(
    signUpForRequest.bind(null, context),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card className="flex flex-col gap-5">
        <CardTitle title={t.personalTitle} description={t.personalIntro} />
        <Field
          label={s.firstName}
          name="firstName"
          autoComplete="given-name"
          required
          defaultValue={state.values?.firstName}
          errors={errors.firstName}
        />
        <Field
          label={s.lastName}
          name="lastName"
          autoComplete="family-name"
          required
          defaultValue={state.values?.lastName}
          errors={errors.lastName}
        />
        <PhoneField
          label={t.phone}
          labelNote={fr.signUp.optional}
          name="phone"
          placeholder="6 00 00 00 00"
          hint={t.phoneHint}
          defaultValue={state.values?.phone}
          errors={errors.phone}
        />
      </Card>
      <Card className="flex flex-col gap-5">
        <CardTitle title={t.spaceTitle} description={t.spaceIntro} />
        <Field
          label={s.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          errors={errors.email}
        />
        <PasswordField
          label={s.password}
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          hint={t.passwordHint}
          errors={errors.password}
        />
        <p className="flex items-start gap-2 rounded-input bg-primary-softer px-3 py-2.5 text-xs text-primary-strong">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          {t.free}
        </p>
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
      </Card>
      <div className="flex justify-center">
        <Button
          type="submit"
          size="lg"
          block={false}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {t.signUpSubmit}
        </Button>
      </div>
    </form>
  );
}

function SignInStep({ context }: { context: RequestContext }) {
  const [state, action, pending] = useActionState(
    signInForRequest.bind(null, context),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate>
      <Card className="flex flex-col gap-5">
        <CardTitle title={t.signInTitle} />
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
        <PasswordField
          id="signin-password"
          label={fr.signIn.password}
          name="password"
          autoComplete="current-password"
          errors={errors.password}
        />
        <Button type="submit" disabled={pending}>
          {t.signInSubmit}
        </Button>
      </Card>
    </form>
  );
}
