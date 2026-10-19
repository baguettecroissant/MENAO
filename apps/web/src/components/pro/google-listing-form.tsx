"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveGoogleListing } from "@/lib/artisan/public-page-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.publicProfile.web;

/** Case « Afficher ma fiche dans Google » (ADR 0144), cochée par défaut. */
export function GoogleListingForm({ indexable }: { indexable: boolean }) {
  const [state, action, pending] = useActionState(saveGoogleListing, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <CheckboxField name="indexable" id="indexable" defaultChecked={indexable}>
        <span className="font-medium">{t.google}</span>
        <span className="mt-0.5 block text-muted-foreground">
          {indexable ? t.googleHint : t.googleOff}
        </span>
      </CheckboxField>
      <Button
        type="submit"
        variant="secondary"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {t.save}
      </Button>
    </form>
  );
}
