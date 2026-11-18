"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { submitOnboarding } from "@/lib/artisan/actions";
import type { FormState } from "@/lib/auth/form";

/** Envoi du dossier en vérification (la base refait les contrôles). */
export function SubmitOnboarding({
  disabled = false,
  label = fr.pro.onboarding.submit.button,
}: {
  disabled?: boolean;
  /** « Renvoyer mon dossier » après un refus ou une demande de compléments (ADR 0376). */
  label?: string;
}) {
  const [state, action, pending] = useActionState<FormState>(submitOnboarding, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" size="lg" disabled={pending || disabled}>
        {label}
        <ArrowRight aria-hidden="true" className="size-5" />
      </Button>
    </form>
  );
}
