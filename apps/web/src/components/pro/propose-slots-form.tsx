"use client";

import { PROPOSED_SLOTS_MAX } from "@menao/core";
import { Check, CircleCheck } from "lucide-react";
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
      <p className="text-[0.9375rem] leading-relaxed text-label">{t.proposeHint}</p>
      {/* Refonte « Nette » (ADR 0255) : un créneau par carte à cocher, l'heure en grand. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[0.9375rem] font-bold">{t.proposeLegend}</legend>
        {suggestions.map((iso) => {
          const on = chosen.includes(iso);
          const day = formatDayMonthShort(iso);
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(iso)}
              className={`flex min-h-14 items-center gap-3 rounded-input bg-surface px-4 text-left transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
                on
                  ? "border-2 border-foreground"
                  : "border border-border hover:border-foreground/40"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-[1.375rem] shrink-0 items-center justify-center rounded-[0.4375rem] ${
                  on ? "bg-foreground text-white" : "border-2 border-border-strong"
                }`}
              >
                {on && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 font-semibold">
                {day.charAt(0).toUpperCase()}
                {day.slice(1)}
              </span>
              <span className="font-display text-[1.0625rem] font-bold">{formatTime(iso)}</span>
            </button>
          );
        })}
        <p
          className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${
            chosen.length >= 2 ? "text-success" : "text-muted-foreground"
          }`}
        >
          {chosen.length >= 2 && <CircleCheck aria-hidden="true" className="size-4" />}
          {t.proposeCount(chosen.length)}
        </p>
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
