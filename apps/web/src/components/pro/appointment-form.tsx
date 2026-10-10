"use client";

import { Calendar, Clock } from "lucide-react";
import { useActionState, type MouseEvent } from "react";
import { Alert, Button, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
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

/** Champs du tiroir « Fixer un rendez-vous » / « Modifier le rendez-vous » (date + heure d'arrivée). */
export function AppointmentForm({
  action,
  submitLabel,
  minDate,
  defaultDate,
  defaultTime,
  hint,
  onSuccess,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Date du jour à Paris (AAAA-MM-JJ) : pas de rendez-vous dans le passé. */
  minDate: string;
  defaultDate?: string;
  defaultTime?: string;
  hint?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  useActionSuccess(state, onSuccess);
  const dateError = state.fieldErrors?.date?.[0];
  const timeError = state.fieldErrors?.time?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rdv-date" className="text-sm font-medium">
          {t.date}
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
            defaultValue={defaultDate}
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
          {t.time}
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
            defaultValue={defaultTime}
            aria-invalid={timeError ? true : undefined}
            aria-describedby={timeError ? "rdv-time-error" : undefined}
            onClick={openPicker}
            className={`${inputClasses} ${pickerInput}`}
          />
        </div>
        {timeError && <FieldError id="rdv-time-error">{timeError}</FieldError>}
      </div>
      {hint && <Hint>{hint}</Hint>}
      <Button type="submit" size="lg" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
