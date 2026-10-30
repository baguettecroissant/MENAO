"use client";

import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { inviteStaff } from "@/lib/admin/staff-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.people.invite;

/** Invitation d'un membre de l'équipe (F-67, ADR 0210) : prénom, nom, e-mail et accès. */
export function StaffInviteForm() {
  const [state, action, pending] = useActionState(inviteStaff, initialFormState);
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
      <SelectField
        key={`role-${state.success ?? ""}`}
        id="staff-role"
        label={f.role}
        name="role"
        hint={f.roleHint}
        defaultValue={v?.role || "admin"}
        errors={errors.role}
        required
      >
        {Object.entries(t.roles).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.submit}
      </Button>
    </form>
  );
}
