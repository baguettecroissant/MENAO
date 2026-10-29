"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { inviteCommercial, setCommercialStatus } from "@/lib/admin/commercial-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.commercials;

/** Invitation d'un commercial (F-65, ADR 0205) : prénom, nom, e-mail et code définitif. */
export function CommercialInviteForm() {
  const [state, action, pending] = useActionState(inviteCommercial, initialFormState);
  const errors = state.fieldErrors ?? {};
  // Après l'envoi, formulaire vide pour l'invitation suivante.
  const v = state.success ? undefined : state.values;
  const f = t.fields;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          key={`first-${state.success ?? ""}`}
          label={f.firstName}
          name="firstName"
          defaultValue={v?.firstName}
          maxLength={100}
          autoComplete="off"
          errors={errors.firstName}
          required
        />
        <Field
          key={`last-${state.success ?? ""}`}
          label={f.lastName}
          name="lastName"
          defaultValue={v?.lastName}
          maxLength={100}
          autoComplete="off"
          errors={errors.lastName}
          required
        />
      </div>
      <Field
        key={`email-${state.success ?? ""}`}
        label={f.email}
        name="email"
        type="email"
        defaultValue={v?.email}
        autoComplete="off"
        errors={errors.email}
        required
      />
      <Field
        key={`code-${state.success ?? ""}`}
        label={f.code}
        name="code"
        hint={f.codeHint}
        defaultValue={v?.code}
        maxLength={32}
        autoComplete="off"
        autoCapitalize="none"
        errors={errors.code}
        required
      />
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.submit}
      </Button>
    </form>
  );
}

/** Suspendre ou réactiver un commercial, depuis sa ligne de la liste. */
export function CommercialStatusForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(setCommercialStatus, initialFormState);
  const next = status === "suspendu" ? "actif" : "suspendu";
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="ghost" size="sm" block={false} disabled={pending}>
        {next === "suspendu" ? t.suspend : t.reactivate}
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
