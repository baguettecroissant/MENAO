"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/auth/form";

/** Appelle `callback` une seule fois par réponse réussie d'une Server Action (ex. fermer un tiroir). */
export function useActionSuccess(state: FormState, callback?: () => void) {
  const handled = useRef<FormState | null>(null);
  useEffect(() => {
    if (state.success && handled.current !== state) {
      handled.current = state;
      callback?.();
    }
  }, [state, callback]);
}
