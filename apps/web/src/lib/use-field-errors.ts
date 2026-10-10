import { useState } from "react";
import type { FormState } from "@/lib/auth/form";

const NONE: ReadonlySet<string> = new Set();

/**
 * Erreurs de champ d'un formulaire : celle d'un champ modifié depuis le dernier envoi n'est plus
 * affichée (le visiteur l'a corrigé). Un nouvel envoi les réaffiche toutes.
 */
export function useFieldErrors(state: FormState) {
  const [edited, setEdited] = useState<{ after: FormState; fields: ReadonlySet<string> }>({
    after: state,
    fields: NONE,
  });
  const fields = edited.after === state ? edited.fields : NONE;
  return {
    errorOf: (field: string) => (fields.has(field) ? undefined : state.fieldErrors?.[field]?.[0]),
    markEdited: (field: string) => {
      if (!fields.has(field)) setEdited({ after: state, fields: new Set([...fields, field]) });
    },
  };
}
