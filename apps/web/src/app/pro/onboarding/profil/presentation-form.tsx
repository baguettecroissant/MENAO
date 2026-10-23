"use client";

import { PRESENTATION_MIN_LENGTH } from "@menao/core";
import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePresentation } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.profile;

export function PresentationForm({ presentation }: { presentation: string | null }) {
  const [state, action, pending] = useActionState(savePresentation, initialFormState);
  const [value, setValue] = useState(state.values?.presentation ?? presentation ?? "");
  const error = state.fieldErrors?.presentation?.[0];
  const length = value.trim().length;

  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <label htmlFor="presentation" className="text-lg font-medium">
        {t.presentation}
      </label>
      <p id="presentation-hint" className="text-sm text-muted-foreground">
        {t.presentationHint}
      </p>
      <textarea
        id="presentation"
        name="presentation"
        rows={6}
        maxLength={2000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={["presentation-hint", "presentation-count", error && "presentation-error"]
          .filter(Boolean)
          .join(" ")}
        className="rounded-input border border-border bg-surface p-3 aria-invalid:border-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <p
        id="presentation-count"
        className={`text-sm ${length >= PRESENTATION_MIN_LENGTH ? "text-success" : "text-muted-foreground"}`}
      >
        {t.presentationCount(length)}
      </p>
      {error && (
        <p id="presentation-error" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.presentationSave}
      </Button>
    </form>
  );
}
