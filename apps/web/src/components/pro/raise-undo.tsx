"use client";

import { TrendingUp } from "lucide-react";
import { useActionState } from "react";
import { fr } from "@/i18n/fr";
import { undoRaise } from "@/lib/artisan/library-raise-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.raise;

/**
 * Bandeau de la dernière hausse (F-149, ADR 0312) dans la bibliothèque : ce qui a changé, l'heure
 * limite et « Annuler la hausse », pendant 24 h.
 */
export function RaiseUndo({
  raiseId,
  text,
  until,
}: {
  raiseId: string;
  text: string;
  until: string;
}) {
  const [state, formAction, pending] = useActionState(undoRaise, initialFormState);
  const limit = new Date(until).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <form
      action={formAction}
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input bg-primary-soft px-4 py-3 text-sm text-primary-strong"
    >
      <input type="hidden" name="raiseId" value={raiseId} />
      <TrendingUp aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex-1">
        {text} {state.error ?? t.undoUntil(limit)}
      </span>
      <button
        type="submit"
        disabled={pending}
        className="font-semibold underline-offset-2 hover:underline disabled:opacity-60"
      >
        {t.undo}
      </button>
    </form>
  );
}
