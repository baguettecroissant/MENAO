"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveArtisanLeadTarget, saveDefaultLeadTarget } from "@/lib/admin/lead-target-actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.admin.leads;
const formKey = (state: FormState) => JSON.stringify(state.values ?? {});

/** Objectif par défaut de tous les artisans (F-131, ADR 0282). */
export function DefaultLeadTargetForm({ target, saved }: { target: number; saved: boolean }) {
  const [state, action, pending] = useActionState(saveDefaultLeadTarget, initialFormState);
  return (
    <form
      key={formKey(state)}
      action={action}
      noValidate
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-40">
        <Field
          label={t.settings.label}
          name="objectif"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          defaultValue={state.values?.objectif ?? String(target)}
          errors={state.fieldErrors?.objectif}
        />
      </div>
      <Button type="submit" size="sm" block={false} disabled={pending}>
        {t.settings.save}
      </Button>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {saved && !state.error && <Alert tone="success">{t.settings.saved}</Alert>}
    </form>
  );
}

/** Objectif propre à un artisan ; vide : objectif par défaut, 0 : hors suivi. */
export function ArtisanLeadTargetForm({
  artisanId,
  target,
  defaultTarget,
}: {
  artisanId: string;
  target: number | null;
  defaultTarget: number;
}) {
  const [state, action, pending] = useActionState(saveArtisanLeadTarget, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="artisan_id" value={artisanId} />
      <div className="w-full max-w-xs">
        <Field
          label={t.detail.ownLabel}
          name="objectif"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          hint={t.detail.ownHint(defaultTarget)}
          defaultValue={state.values?.objectif ?? (target === null ? "" : String(target))}
          errors={state.fieldErrors?.objectif}
        />
      </div>
      <Button type="submit" size="sm" block={false} disabled={pending}>
        {t.detail.save}
      </Button>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
    </form>
  );
}
