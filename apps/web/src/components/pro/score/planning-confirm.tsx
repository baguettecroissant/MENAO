"use client";

import { CalendarCheck } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { confirmPlanning } from "@/lib/artisan/score-actions";

const t = fr.pro.score;

/** Bouton « Mon planning est à jour » (confirmation sans modification). */
export function PlanningConfirm() {
  const [state, action, pending] = useActionState(confirmPlanning, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Button type="submit" variant="secondary" disabled={pending}>
        <CalendarCheck aria-hidden="true" className="size-4" />
        {t.confirm}
      </Button>
    </form>
  );
}
