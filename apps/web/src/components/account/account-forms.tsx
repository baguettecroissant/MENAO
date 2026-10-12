"use client";

import { ACCOUNT_DELETION_MESSAGE_MAX_LENGTH } from "@menao/validation";
import { useActionState, useState } from "react";
import { PasswordField, PhoneField } from "@/components/form-fields";
import {
  Alert,
  Button,
  CheckboxField,
  Field,
  FieldError,
  TextLink,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  changeEmail,
  changePassword,
  requestAccountDeletion,
  saveAccountProfile,
  saveCommunications,
} from "@/lib/account/actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.account;

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

/** « Mes informations » : prénom, nom, téléphone (obligatoire pour un compte professionnel). */
export function ProfileForm({
  firstName,
  lastName,
  phone,
  pro,
}: {
  firstName: string;
  lastName: string;
  phone: string | null;
  pro: boolean;
}) {
  const [state, action, pending] = useActionState(saveAccountProfile, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.profile.firstName}
          name="firstName"
          autoComplete="given-name"
          defaultValue={state.values?.firstName ?? firstName}
          errors={errors.firstName}
        />
        <Field
          label={t.profile.lastName}
          name="lastName"
          autoComplete="family-name"
          defaultValue={state.values?.lastName ?? lastName}
          errors={errors.lastName}
        />
      </div>
      <PhoneField
        label={t.profile.phone}
        name="phone"
        labelNote={pro ? undefined : t.profile.phoneOptional}
        hint={pro ? t.profile.phoneHintPro : t.profile.phoneHintClient}
        defaultValue={state.values?.phone ?? (phone ? phone.replace(/^\+33/, "0") : "")}
        errors={errors.phone}
      />
      <Button type="submit" disabled={pending} block={false} className="self-start">
        {t.profile.save}
      </Button>
    </form>
  );
}

/** Adresse e-mail : changement confirmé par les liens envoyés aux deux adresses. */
export function EmailForm({ email, pendingEmail }: { email: string; pendingEmail: string | null }) {
  const [state, action, pending] = useActionState(changeEmail, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-sm">
        <span className="text-muted-foreground">{t.email.current} : </span>
        <span className="font-medium">{email}</span>
      </p>
      {pendingEmail && !state.success && <Alert tone="info">{t.email.pending(pendingEmail)}</Alert>}
      <Feedback state={state} />
      <Field
        label={t.email.label}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email ?? ""}
        hint={t.email.hint}
        errors={state.fieldErrors?.email}
      />
      <Button type="submit" disabled={pending} block={false} className="self-start">
        {t.email.submit}
      </Button>
    </form>
  );
}

/** Mot de passe : l'actuel, puis le nouveau ; les autres appareils sont ensuite déconnectés. */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <PasswordField
        label={t.password.current}
        name="currentPassword"
        autoComplete="current-password"
        errors={errors.currentPassword}
      />
      <PasswordField
        label={t.password.new}
        name="password"
        autoComplete="new-password"
        hint={t.password.hint}
        errors={errors.password}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} block={false}>
          {t.password.submit}
        </Button>
        <TextLink href="/mot-de-passe-oublie" className="text-sm">
          {t.password.forgot}
        </TextLink>
      </div>
    </form>
  );
}

/** Communications marketing : consentement libre, retirable à tout moment. */
export function CommunicationsForm({ marketingOptIn }: { marketingOptIn: boolean }) {
  const [state, action, pending] = useActionState(saveCommunications, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <div className="flex flex-col gap-1.5">
        <CheckboxField name="marketingOptIn" defaultChecked={marketingOptIn}>
          {t.communications.marketing}
        </CheckboxField>
        <p className="pl-[1.875rem] text-sm text-muted-foreground">
          {t.communications.marketingHint}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} block={false} variant="secondary">
          {t.communications.save}
        </Button>
        <TextLink href="/notifications" className="text-sm">
          {t.communications.notifications}
        </TextLink>
      </div>
    </form>
  );
}

/** Demande de suppression du compte : formulaire déplié à la demande, confirmation explicite. */
export function DeletionForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestAccountDeletion, initialFormState);
  const errors = state.fieldErrors ?? {};
  if (!open && !state.fieldErrors && !state.error) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-touch self-start text-sm font-medium text-danger underline-offset-2 hover:underline"
      >
        {t.deletion.open}
      </button>
    );
  }
  const messageError = errors.message?.[0];
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="deletion-message" className="text-sm font-medium">
          {t.deletion.message}
          <span className="font-normal text-subtle-foreground"> {t.deletion.messageNote}</span>
        </label>
        <textarea
          id="deletion-message"
          name="message"
          rows={3}
          maxLength={ACCOUNT_DELETION_MESSAGE_MAX_LENGTH}
          defaultValue={state.values?.message ?? ""}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "deletion-message-error" : undefined}
          className={`${inputClasses} py-3`}
        />
        {messageError && <FieldError id="deletion-message-error">{messageError}</FieldError>}
      </div>
      <CheckboxField name="confirm" id="deletion-confirm" errors={errors.confirm}>
        {t.deletion.confirm}
      </CheckboxField>
      <Button
        type="submit"
        variant="danger"
        disabled={pending}
        block={false}
        className="self-start"
      >
        {t.deletion.submit}
      </Button>
    </form>
  );
}
