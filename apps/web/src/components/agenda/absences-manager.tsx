"use client";

import { addDays, daysBetween } from "@menao/core";
import { Palmtree } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, Field, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addAbsence, deleteAbsence } from "@/lib/artisan/agenda-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";
import { formatDayMonthShort } from "@/lib/format";
import { RemoveButton } from "./remove-button";

const t = fr.pro.agenda.availability.absences;

type AbsenceRow = { id: string; startsOn: string; endsOn: string; label: string | null };

/**
 * Congés et absences (F-44) : pendant une absence, l'artisan n'est plus proposé dans les
 * recherches. Liste des absences en cours et à venir, ajout avec motifs fréquents.
 */
export function AbsencesManager({ absences, today }: { absences: AbsenceRow[]; today: string }) {
  return (
    <section
      id="absences"
      aria-labelledby="absences-titre"
      className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="absences-titre" className="flex items-center gap-2 text-[1.0625rem] font-medium">
          <Palmtree aria-hidden="true" className="size-[1.125rem] text-primary" />
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.text}</p>
      </div>

      {absences.length === 0 ? (
        <p className="mt-4 rounded-input border border-dashed border-border-strong px-4 py-5 text-center text-sm text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {absences.map((a) => {
            const period = t.period(formatDayMonthShort(a.startsOn), formatDayMonthShort(a.endsOn));
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-input border border-border bg-background/60 py-2 pr-1.5 pl-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium first-letter:uppercase">{period}</p>
                  <p className="text-xs text-muted-foreground">
                    {[t.days(daysBetween(a.startsOn, a.endsOn) + 1), a.label]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {a.startsOn <= today && <StatusBadge tone="warning">{t.ongoing}</StatusBadge>}
                <RemoveButton action={deleteAbsence.bind(null, a.id)} label={t.remove(period)} />
              </li>
            );
          })}
        </ul>
      )}

      <AddAbsenceForm today={today} />
    </section>
  );
}

function AddAbsenceForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addAbsence, initialFormState);
  const [startsOn, setStartsOn] = useState("");
  const [label, setLabel] = useState("");
  useActionSuccess(state, () => {
    setStartsOn("");
    setLabel("");
  });
  const errors = state.fieldErrors;

  return (
    <form
      action={action}
      noValidate
      className="mt-5 flex flex-col gap-3 border-t border-border pt-5"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          required
          min={today}
          label={t.from}
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          errors={errors?.startsOn}
          className="bg-surface"
        />
        <Field
          // Remis à zéro avec le premier jour : le dernier jour ne peut pas le précéder.
          key={startsOn}
          name="endsOn"
          type="date"
          required
          min={startsOn || today}
          max={startsOn ? addDays(startsOn, 364) : undefined}
          label={t.to}
          defaultValue={state.values?.endsOn ?? startsOn}
          errors={errors?.endsOn}
          className="bg-surface"
        />
      </div>
      <Field
        name="label"
        label={t.label}
        labelNote={t.labelNote}
        maxLength={80}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        errors={errors?.label}
        className="bg-surface"
      />
      <div role="group" aria-label={t.suggestionsLabel} className="flex flex-wrap gap-1.5">
        {t.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={label === s}
            onClick={() => setLabel(s)}
            className="inline-flex min-h-8 items-center rounded-pill border border-border bg-background px-3 text-xs hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-primary-softer aria-pressed:text-primary-strong"
          >
            {s}
          </button>
        ))}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {t.add}
      </Button>
    </form>
  );
}
