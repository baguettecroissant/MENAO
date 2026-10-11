"use client";

import { Calendar, Clock, Sparkles } from "lucide-react";
import { useActionState, useState, type MouseEvent } from "react";
import { SlotWarnings } from "@/components/agenda/slot-warnings";
import { Alert, Button, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { formatDayMonthShort, formatTime, parisInputValues } from "@/lib/format";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.appointment;
// Icône à gauche comme sur la maquette ; celle du navigateur est masquée et le clic sur le champ
// ouvre le sélecteur.
const pickerInput = "bg-surface pl-11 [&::-webkit-calendar-picker-indicator]:hidden";

function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Sélecteur indisponible (navigateur ancien) : saisie au clavier.
  }
}

/**
 * Champs du tiroir « Fixer un rendez-vous » / « Modifier le rendez-vous » (date + heure d'arrivée),
 * repris pour la date de démarrage du chantier (F-22). Avec l'agenda (F-44) : créneaux libres
 * proposés et avertissements (absence, hors horaires, autre élément au même moment).
 */
export function AppointmentForm({
  action,
  submitLabel,
  minDate,
  defaultDate,
  defaultTime,
  hint,
  dateLabel = t.date,
  timeLabel = t.time,
  onSuccess,
  agenda,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Date du jour à Paris (AAAA-MM-JJ) : pas de rendez-vous dans le passé. */
  minDate: string;
  defaultDate?: string;
  defaultTime?: string;
  hint?: string;
  dateLabel?: string;
  timeLabel?: string;
  onSuccess?: () => void;
  agenda?: AppointmentAgenda;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  useActionSuccess(state, onSuccess);
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const dateError = state.fieldErrors?.date?.[0];
  const timeError = state.fieldErrors?.time?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {agenda && agenda.suggestions.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            {t.suggestions}
          </legend>
          <div className="flex flex-wrap gap-2">
            {agenda.suggestions.map((iso) => {
              const values = parisInputValues(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={values.date === date && values.time === time}
                  onClick={() => {
                    setDate(values.date);
                    setTime(values.time);
                  }}
                  className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-3.5 text-sm transition-colors hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-primary-softer aria-pressed:font-medium aria-pressed:text-primary-strong"
                >
                  {t.suggestion(formatDayMonthShort(iso), formatTime(iso))}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t.suggestionsHint}</p>
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rdv-date" className="text-sm font-medium">
          {dateLabel}
        </label>
        <div className="relative">
          <Calendar
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="rdv-date"
            name="date"
            type="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? "rdv-date-error" : undefined}
            onClick={openPicker}
            className={`${inputClasses} ${pickerInput}`}
          />
        </div>
        {dateError && <FieldError id="rdv-date-error">{dateError}</FieldError>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rdv-time" className="text-sm font-medium">
          {timeLabel}
        </label>
        <div className="relative">
          <Clock
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="rdv-time"
            name="time"
            type="time"
            required
            step={300}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-invalid={timeError ? true : undefined}
            aria-describedby={timeError ? "rdv-time-error" : undefined}
            onClick={openPicker}
            className={`${inputClasses} ${pickerInput}`}
          />
        </div>
        {timeError && <FieldError id="rdv-time-error">{timeError}</FieldError>}
      </div>
      {agenda && <SlotWarnings date={date} time={time} agenda={agenda} />}
      {hint && <Hint>{hint}</Hint>}
      <Button type="submit" size="lg" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
