"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { completeSpotCheck } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.spotChecks;

/** Résultat d'un contrôle aléatoire (ADR 0121) : note, appel à l'assureur, conforme ou non. */
export function SpotCheckForm({ spotCheckId }: { spotCheckId: string }) {
  const [state, action, pending] = useActionState(completeSpotCheck, initialFormState);
  const noteId = `note-${spotCheckId}`;
  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="spotCheckId" value={spotCheckId} />
      <label htmlFor={noteId} className="text-sm font-medium">
        {t.note}
      </label>
      <textarea
        id={noteId}
        name="note"
        rows={2}
        maxLength={1000}
        aria-describedby={`${noteId}-hint`}
        className="rounded-button border border-border bg-surface p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <p id={`${noteId}-hint`} className="text-xs text-muted-foreground">
        {t.noteHint}
      </p>
      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="insurerCalled" className="size-4 accent-primary" />
        {t.insurerCalled}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="result"
          value="conforme"
          disabled={pending}
          className="sm:w-auto sm:px-4"
        >
          {t.markConforme}
        </Button>
        <Button
          type="submit"
          name="result"
          value="non_conforme"
          disabled={pending}
          variant="danger"
          className="sm:w-auto sm:px-4"
        >
          {t.markNonConforme}
        </Button>
      </div>
    </form>
  );
}
