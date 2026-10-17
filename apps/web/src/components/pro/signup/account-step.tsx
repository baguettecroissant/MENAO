"use client";

import type { ArtisanSignupDraft, OAuthProvider } from "@menao/core";
import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { ArrowRight } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Alert, Button, CheckboxField, Field, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import {
  completeArtisanOAuthSignup,
  continueAsArtisanWithProvider,
  signUpArtisan,
  type ArtisanSignupState,
} from "@/lib/auth/artisan-signup-actions";
import { StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.account;
const s = fr.signUp;

export type OAuthIdentity = {
  providerLabel: string;
  email: string | null;
  firstName: string;
  lastName: string;
};

/** Choix du parcours, dans la forme attendue par le serveur (revérifiée là-bas). */
function profilePayload(draft: ArtisanSignupDraft) {
  return {
    tradeCodes: draft.tradeCodes,
    siret: draft.company?.siret,
    isDirigeant: draft.isDirigeant,
    assujettiTva: draft.assujettiTva,
    zone: draft.base && {
      mode: "rayon",
      baseLabel: draft.base.label,
      baseCitycode: draft.base.citycode,
      lon: draft.base.lon,
      lat: draft.base.lat,
      radiusKm: draft.radiusKm,
    },
  };
}

function accountFields(form: FormData) {
  const value = (name: string) => String(form.get(name) ?? "");
  return {
    firstName: value("firstName"),
    lastName: value("lastName"),
    phone: value("phone"),
    email: value("email"),
    password: value("password"),
    acceptTerms: form.get("acceptTerms") === "on",
    acceptCgv: form.get("acceptCgv") === "on",
    marketingOptIn: form.get("marketingOptIn") === "on",
  };
}

/** Étape « compte » : par e-mail (puis code reçu par e-mail), ou finalisation Google ou Apple. */
export function AccountStep({
  draft,
  providers,
  oauth,
  onCodeSent,
  onProfileInvalid,
}: {
  draft: ArtisanSignupDraft;
  providers: readonly OAuthProvider[];
  oauth?: OAuthIdentity;
  onCodeSent: (email: string) => void;
  onProfileInvalid: () => void;
}) {
  const [state, setState] = useState<ArtisanSignupState>({});
  const [pending, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};
  // Le dirigeant qui s'est reconnu à l'étape « entreprise » n'a pas à retaper son nom.
  const manager = draft.isDirigeant ? draft.company?.managers[0] : undefined;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const account = accountFields(new FormData(e.currentTarget));
    startTransition(async () => {
      // La finalisation Google ou Apple redirige en cas de succès : elle ne renvoie alors rien.
      const result = (
        oauth
          ? await completeArtisanOAuthSignup({ profile: profilePayload(draft), account })
          : await signUpArtisan({ profile: profilePayload(draft), account })
      ) as ArtisanSignupState | undefined;
      if (!result) return;
      if (result.codeSentTo) return onCodeSent(result.codeSentTo);
      setState(result);
      if (result.profileInvalid) onProfileInvalid();
    });
  }

  return (
    <>
      <StepTitle
        title={oauth ? t.oauthTitle : t.title}
        lead={oauth ? t.oauthLead(oauth.providerLabel, oauth.email) : t.lead}
      />
      {!oauth && <OAuthButtons providers={providers} action={continueAsArtisanWithProvider} />}

      <form id="artisan-account" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={s.firstName}
            name="firstName"
            autoComplete="given-name"
            required
            defaultValue={oauth?.firstName || manager?.firstName}
            errors={errors.firstName}
          />
          <Field
            label={s.lastName}
            name="lastName"
            autoComplete="family-name"
            required
            defaultValue={oauth?.lastName || manager?.lastName}
            errors={errors.lastName}
          />
        </div>
        {!oauth && (
          <>
            <Field
              label={t.email}
              name="email"
              type="email"
              autoComplete="email"
              required
              errors={errors.email}
            />
            <PasswordField
              label={s.password}
              name="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              hint={s.passwordHint}
              errors={errors.password}
            />
          </>
        )}
        <PhoneField
          label={t.phone}
          name="phone"
          required
          hint={t.phoneHint}
          errors={errors.phone}
        />
        <div className="flex flex-col gap-3">
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
          <CheckboxField name="acceptCgv" required errors={errors.acceptCgv}>
            {t.acceptCgvBefore}
            <TextLink href="/cgv-artisans" target="_blank">
              {t.cgv}
            </TextLink>
            .
          </CheckboxField>
          <CheckboxField name="marketingOptIn">{s.marketing}</CheckboxField>
        </div>
      </form>

      {oauth && (
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-touch text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            {t.notYou}
          </button>
        </form>
      )}

      <StepFooter>
        <Button size="lg" type="submit" form="artisan-account" disabled={pending}>
          {oauth ? t.oauthSubmit : t.submit}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
