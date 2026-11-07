"use client";

import { TEAM_ROLES, type TeamRole } from "@menao/core";
import { useActionState, useState } from "react";
import { Alert, Button, Field, Select, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { inviteTeamMember, updateTeamMember } from "@/lib/artisan/team-actions";

const t = fr.pro.team;

/** Invitation d'un membre (F-89, ADR 0240) : prénom, nom, e-mail et rôle. */
export function TeamInviteForm() {
  const [state, action, pending] = useActionState(inviteTeamMember, initialFormState);
  const errors = state.fieldErrors ?? {};
  // Après l'envoi, formulaire vide pour l'invitation suivante.
  const v = state.success ? undefined : state.values;
  const k = state.success ?? "";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          key={`first-${k}`}
          label={t.invite.firstName}
          name="firstName"
          defaultValue={v?.firstName}
          maxLength={100}
          autoComplete="off"
          errors={errors.firstName}
          required
        />
        <Field
          key={`last-${k}`}
          label={t.invite.lastName}
          name="lastName"
          defaultValue={v?.lastName}
          maxLength={100}
          autoComplete="off"
          errors={errors.lastName}
          required
        />
      </div>
      <Field
        key={`email-${k}`}
        label={t.invite.email}
        name="email"
        type="email"
        defaultValue={v?.email}
        autoComplete="off"
        errors={errors.email}
        required
      />
      <SelectField
        key={`role-${k}`}
        id="team-role"
        label={t.invite.role}
        name="role"
        defaultValue={v?.role || "ouvrier"}
        errors={errors.role}
        required
      >
        {TEAM_ROLES.map((role) => (
          <option key={role} value={role}>
            {t.roles[role]}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.invite.submit}
      </Button>
    </form>
  );
}

/** Actions du patron sur un membre : rôle, suspension ou réactivation, retrait (confirmé). */
export function TeamMemberActions({
  userId,
  name,
  role,
  suspended,
}: {
  userId: string;
  name: string;
  role: TeamRole;
  suspended: boolean;
}) {
  const [state, action, pending] = useActionState(updateTeamMember, initialFormState);
  const [confirming, setConfirming] = useState(false);
  const hidden = (
    <>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="name" value={name} />
    </>
  );
  return (
    <div className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        <form action={action} className="min-w-40">
          {hidden}
          <input type="hidden" name="intent" value="role" />
          <Select
            name="role"
            aria-label={t.actions.role(name)}
            defaultValue={role}
            disabled={pending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {TEAM_ROLES.map((r) => (
              <option key={r} value={r}>
                {t.roles[r]}
              </option>
            ))}
          </Select>
        </form>
        <form action={action}>
          {hidden}
          <input type="hidden" name="intent" value={suspended ? "reactivate" : "suspend"} />
          <Button type="submit" variant="secondary" block={false} disabled={pending}>
            {suspended ? t.actions.reactivate : t.actions.suspend}
          </Button>
        </form>
        {!confirming && (
          <Button
            type="button"
            variant="danger-text"
            block={false}
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            {t.actions.remove}
          </Button>
        )}
      </div>
      {confirming && (
        <form
          action={action}
          className="flex flex-col gap-2 rounded-input border border-danger/30 bg-danger-soft p-3"
        >
          {hidden}
          <input type="hidden" name="intent" value="remove" />
          <p className="text-sm text-foreground">{t.actions.confirmRemove(name)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" block={false} disabled={pending}>
              {t.actions.remove}
            </Button>
            <Button
              type="button"
              variant="secondary"
              block={false}
              onClick={() => setConfirming(false)}
            >
              {t.actions.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
