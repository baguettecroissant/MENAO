"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveGoogleReviews } from "@/lib/admin/score-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.detail.menaoScore;

/** Avis Google relevés par l'équipe (ADR 0155) : lien de la fiche, note et nombre d'avis. */
export function GoogleReviewsForm({
  artisanId,
  current,
}: {
  artisanId: string;
  current: { url: string; rating: number; count: number } | null;
}) {
  const [state, action, pending] = useActionState(saveGoogleReviews, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="artisan" value={artisanId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field
        label={t.url}
        name="url"
        type="url"
        inputMode="url"
        placeholder="https://maps.app.goo.gl/…"
        defaultValue={state.values?.url ?? current?.url ?? ""}
        errors={errors.url}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t.rating}
          name="rating"
          inputMode="decimal"
          defaultValue={
            state.values?.rating ?? (current ? current.rating.toLocaleString("fr-FR") : "")
          }
          errors={errors.rating}
        />
        <Field
          label={t.count}
          name="count"
          inputMode="numeric"
          defaultValue={state.values?.count ?? (current ? String(current.count) : "")}
          errors={errors.count}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" block={false} disabled={pending}>
          {t.save}
        </Button>
        {current && (
          <Button
            type="submit"
            name="intent"
            value="clear"
            variant="danger-text"
            block={false}
            disabled={pending}
          >
            {t.clear}
          </Button>
        )}
      </div>
    </form>
  );
}
