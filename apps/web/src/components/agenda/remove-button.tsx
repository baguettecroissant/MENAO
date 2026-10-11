"use client";

import { LoaderCircle, X } from "lucide-react";
import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/auth/form";

/**
 * Bouton « retirer » (absence, créneau bloqué) : icône seule avec un libellé accessible ; le
 * message d'erreur éventuel s'affiche en infobulle et pour les lecteurs d'écran.
 */
export function RemoveButton({
  action,
  label,
  className = "size-8 opacity-70 hover:opacity-100",
}: {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
  /** Taille, position et opacité (par défaut : size-8, estompé jusqu'au survol). */
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="contents">
      <button
        type="submit"
        aria-label={label}
        title={state.error ?? label}
        disabled={pending}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-current hover:bg-black/5 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:cursor-wait ${className}`}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <X aria-hidden="true" className="size-4" />
        )}
      </button>
      {state.error && (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      )}
    </form>
  );
}
