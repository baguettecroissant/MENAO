"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { setLaunchTaskStatus } from "@/lib/launch/actions";

const t = fr.commercialLaunch.board;

/**
 * Bouton rond pour cocher une tâche faite, ou la rouvrir (F-66, ADR 0208). Formulaire envoyé à
 * l'action serveur, utilisable avant le chargement de JavaScript ; la page se met à jour ensuite.
 */
export function LaunchTaskToggle({
  taskId,
  title,
  done,
}: {
  taskId: string;
  title: string;
  done: boolean;
}) {
  const [state, action, pending] = useActionState(setLaunchTaskStatus, initialFormState);
  return (
    <form action={action} className="flex shrink-0 flex-col items-center">
      <input type="hidden" name="task" value={taskId} />
      <input type="hidden" name="statut" value={done ? "a_faire" : "fait"} />
      {/* Zone de contact de 44 px autour du rond de 26 px (marge négative : alignement). */}
      <button
        type="submit"
        disabled={pending}
        aria-label={done ? t.reopen(title) : t.markDone(title)}
        className="group -m-[0.5625rem] flex size-11 items-center justify-center rounded-full outline-none disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`flex size-[1.625rem] items-center justify-center rounded-full border-2 transition-colors group-focus-visible:ring-4 group-focus-visible:ring-primary/20 ${
            done
              ? "border-success bg-success text-primary-foreground"
              : "border-border-strong bg-surface text-transparent group-hover:border-primary group-hover:text-primary"
          }`}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </button>
      {state.error && (
        <span
          role="alert"
          className="mt-1 w-16 text-center text-[0.6875rem] leading-tight text-danger"
        >
          {state.error}
        </span>
      )}
    </form>
  );
}
