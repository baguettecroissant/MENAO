"use client";

import {
  SUGGESTION_DEBOUNCE_MS,
  SUGGESTION_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  type NeedSuggestion,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Suggestion reçue, avec le texte pour lequel elle a été faite. */
export type ActiveSuggestion = NeedSuggestion & { base: string };

/**
 * Suggestions pendant la saisie du besoin (ADR 0177) : demandées à suggest-need après une courte
 * pause de frappe, gardées en mémoire pour un texte déjà vu. Une réponse dépassée (le texte a
 * changé depuis) est ignorée ; en cas d'échec, rien ne change à l'écran. Limite atteinte : plus
 * aucune demande sur cette page.
 */
export function useNeedSuggestions(text: string, enabled: boolean): ActiveSuggestion | null {
  const [suggestion, setSuggestion] = useState<ActiveSuggestion | null>(null);
  const cache = useRef(new Map<string, NeedSuggestion | null>());
  const lastRequest = useRef(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled || stopped.current) return;
    if (text.trim().length < SUGGESTION_MIN_LENGTH || text.length > SUGGESTION_MAX_LENGTH) return;
    const cached = cache.current.get(text);
    const timer = setTimeout(
      async () => {
        const request = ++lastRequest.current;
        let result = cached;
        if (result === undefined) {
          const { data, error } = await createClient().functions.invoke<
            { status: string } & Partial<NeedSuggestion>
          >("suggest-need", { method: "POST", body: { text } });
          if (error instanceof FunctionsHttpError && error.context.status === 429) {
            stopped.current = true;
          }
          result =
            !error && data?.status === "ok"
              ? { completion: data.completion ?? null, ideas: data.ideas ?? [] }
              : null;
          cache.current.set(text, result);
        }
        if (request === lastRequest.current && result) setSuggestion({ ...result, base: text });
      },
      cached === undefined ? SUGGESTION_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [text, enabled]);

  return suggestion;
}
