"use client";

import { useActionState } from "react";
import { Alert, Button, Card, CardTitle, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { saveCommercialAlertSettings } from "@/lib/admin/commercial-actions";

const t = fr.commercialField.moments.admin;

/** Back-office : quand prévenir les conseillers de leurs artisans à relancer (ADR 0396). */
export function CommercialAlertSettingsCard({
  settings,
}: {
  settings: { bloque_jours: number; fin_essai_jours: number; lien_jours: number };
}) {
  const [state, action, pending] = useActionState(saveCommercialAlertSettings, initialFormState);
  return (
    <Card className="flex flex-col gap-4 lg:max-w-2xl">
      <CardTitle title={t.title} description={t.lead} />
      <form action={action} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t.bloque}
            name="bloque"
            type="number"
            min={1}
            max={30}
            defaultValue={state.values?.bloque ?? settings.bloque_jours}
          />
          <Field
            label={t.finEssai}
            name="finEssai"
            type="number"
            min={1}
            max={30}
            defaultValue={state.values?.finEssai ?? settings.fin_essai_jours}
          />
          <Field
            label={t.lien}
            name="lien"
            type="number"
            min={1}
            max={6}
            defaultValue={state.values?.lien ?? settings.lien_jours}
          />
        </div>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <Button type="submit" block={false} disabled={pending} className="self-start">
          {t.save}
        </Button>
      </form>
    </Card>
  );
}
