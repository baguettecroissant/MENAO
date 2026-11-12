"use client";

import { formatEurosInput } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, Card, CardTitle, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveLibrarySettings } from "@/lib/artisan/library-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.settings;

/** Réglages de chiffrage (F-141, ADR 0293) : heure, coefficient, seuil d'alerte facultatif. */
export function LibrarySettingsForm({
  hourCostCents,
  hourPriceCents,
  coef,
  alertBp,
}: {
  hourCostCents: number | null;
  hourPriceCents: number | null;
  coef: string;
  alertBp: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveLibrarySettings, initialFormState);
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle title={t.title} description={t.lead} />
      <form action={formAction} className="flex flex-col gap-3">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <Field
          label={t.hourCost}
          name="hourCost"
          inputMode="decimal"
          hint={t.hourCostHint}
          defaultValue={hourCostCents === null ? "" : formatEurosInput(hourCostCents)}
        />
        <Field
          label={t.hourPrice}
          name="hourPrice"
          inputMode="decimal"
          defaultValue={hourPriceCents === null ? "" : formatEurosInput(hourPriceCents)}
        />
        <Field
          label={t.coef}
          name="coef"
          inputMode="decimal"
          hint={t.coefHint}
          defaultValue={coef}
        />
        <Field
          label={t.alert}
          name="alert"
          inputMode="decimal"
          hint={t.alertHint}
          defaultValue={alertBp === null ? "" : String(alertBp / 100).replace(".", ",")}
        />
        <p className="text-sm text-muted-foreground">{t.note}</p>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          block={false}
          className="self-start"
        >
          {t.save}
        </Button>
      </form>
    </Card>
  );
}
