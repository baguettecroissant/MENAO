"use client";

import { PROPOSED_SLOTS_MAX } from "@menao/core";
import { Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { formatDayMonthShort, formatTime } from "@/lib/format";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.appointment;

/**
 * Accepter en un toucher (ADR 0222) : créneaux libres de l'agenda, les 3 premiers cochés ; le
 * client en choisit un, ce qui fixe le rendez-vous.
 */
export function ProposeSlotsForm({
  suggestions,
  action,
  onDone,
}: {
  suggestions: readonly string[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  useActionSuccess(state, onDone);
  const [chosen, setChosen] = useState<string[]>(suggestions.slice(0, PROPOSED_SLOTS_MAX));
  const toggle = (iso: string) =>
    setChosen((current) =>
      current.includes(iso)
        ? current.filter((v) => v !== iso)
        : current.length < PROPOSED_SLOTS_MAX
          ? [...current, iso]
          : current,
    );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <p className="text-sm text-muted-foreground">{t.proposeHint}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          {t.proposeLegend}
        </legend>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((iso) => (
            <button
              key={iso}
              type="button"
              aria-pressed={chosen.includes(iso)}
              onClick={() => toggle(iso)}
              className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-3.5 text-sm transition-colors hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-primary-softer aria-pressed:font-medium aria-pressed:text-primary-strong"
            >
              {t.suggestion(formatDayMonthShort(iso), formatTime(iso))}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t.proposeCount(chosen.length)}</p>
      </fieldset>
      {chosen.map((iso) => (
        <input key={iso} type="hidden" name="slot" value={iso} />
      ))}
      <Button type="submit" size="lg" disabled={pending || chosen.length < 2}>
        {t.proposeSubmit}
      </Button>
    </form>
  );
}
