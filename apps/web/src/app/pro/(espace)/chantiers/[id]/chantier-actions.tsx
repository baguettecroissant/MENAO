"use client";

import { Calendar, Clock, NotebookPen, Plus } from "lucide-react";
import { useActionState, useCallback, useState, type MouseEvent } from "react";
import { Drawer } from "@/components/drawer";
import { AppointmentForm } from "@/components/pro/appointment-form";
import { PhotoUpload } from "@/components/pro/chantier-journal-forms";
import { Alert, Button, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  cancelChantier,
  confirmChantierStart,
  declareChantierFinished,
  editChantierStart,
  rescheduleAppointment,
  saveAppointmentNotes,
} from "@/lib/artisan/chantier-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.appointment;
const tf = fr.pro.followUp;
// Champs date et heure : icône à gauche comme sur la maquette, sélecteur ouvert au clic.
const pickerInput = "bg-surface pl-10 [&::-webkit-calendar-picker-indicator]:hidden";

function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Sélecteur indisponible (navigateur ancien) : saisie au clavier.
  }
}

/** « Modifier » dans le bandeau du rendez-vous : nouvelle date et heure d'arrivée. */
export function RescheduleButton({
  chantierId,
  minDate,
  date,
  time,
}: {
  chantierId: string;
  minDate: string;
  date: string;
  time: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md text-sm font-medium text-white underline underline-offset-2 hover:text-white/85 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        {t.reschedule}
      </button>
      <Drawer open={open} onClose={close} title={t.rescheduleTitle} backLabel={t.backToForm}>
        <AppointmentForm
          action={rescheduleAppointment.bind(null, chantierId)}
          submitLabel={t.rescheduleSubmit}
          minDate={minDate}
          defaultDate={date}
          defaultTime={time}
          onSuccess={close}
        />
      </Drawer>
    </>
  );
}

/** « + Ajouter des notes » (maquette) : notes privées, visibles par l'artisan seul. */
export function NotesBlock({ chantierId, notes }: { chantierId: string; notes: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveAppointmentNotes.bind(null, chantierId),
    initialFormState,
  );
  const stopEditing = useCallback(() => setEditing(false), []);
  useActionSuccess(state, stopEditing);

  if (!editing) {
    return (
      <section aria-label={t.notes} className="flex flex-col gap-2">
        {state.success && <Alert tone="success">{state.success}</Alert>}
        {notes && (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-[1.0625rem] font-medium">
              <NotebookPen aria-hidden="true" className="size-[1.125rem] text-primary" />
              {t.notes}
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line">{notes}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-h-14 items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-surface/60 text-sm font-medium text-primary-strong hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <Plus aria-hidden="true" className="size-4" />
          {notes ? t.editNotes : t.addNotes}
        </button>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
      noValidate
    >
      <label htmlFor="notes" className="flex items-center gap-2 text-[1.0625rem] font-medium">
        <NotebookPen aria-hidden="true" className="size-[1.125rem] text-primary" />
        {t.notes}
      </label>
      <p className="text-xs text-muted-foreground">{t.notesHint}</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <textarea
        id="notes"
        name="notes"
        rows={5}
        maxLength={5000}
        defaultValue={state.values?.notes ?? notes ?? ""}
        autoFocus
        aria-invalid={state.fieldErrors?.notes ? true : undefined}
        className={`${inputClasses} min-h-32 py-3`}
      />
      {state.fieldErrors?.notes && <FieldError>{state.fieldErrors.notes[0]}</FieldError>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" block={false} onClick={stopEditing}>
          {t.backToForm}
        </Button>
        <Button type="submit" block={false} disabled={pending}>
          {t.saveNotes}
        </Button>
      </div>
    </form>
  );
}

/** « Annuler le chantier » (maquette, lien rouge) : confirmation dans un tiroir. */
export function CancelChantierButton({ chantierId }: { chantierId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(
    cancelChantier.bind(null, chantierId),
    initialFormState,
  );
  useActionSuccess(state, close);
  return (
    <>
      <Button type="button" variant="danger-text" size="sm" onClick={() => setOpen(true)}>
        {t.cancel}
      </Button>
      <Drawer open={open} onClose={close} title={t.cancelTitle} backLabel={t.backToForm}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.cancelIntro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              {t.cancelReason}{" "}
              <span className="font-normal text-subtle-foreground">{t.cancelReasonNote}</span>
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              defaultValue={state.values?.reason}
              rows={3}
              maxLength={500}
              className={`${inputClasses} min-h-24 py-3`}
            />
            {state.fieldErrors?.reason && <FieldError>{state.fieldErrors.reason[0]}</FieldError>}
          </div>
          <Button type="submit" variant="danger" size="lg" disabled={pending}>
            {t.cancelConfirm}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

/**
 * F-22 « Confirmer la date de démarrage » (maquette « Vue d'un chantier - Date à confirmer ») :
 * panneau en bas de l'écran, date et heure côte à côte. L'action mène ensuite à la confirmation
 * (?demarrage=confirme).
 */
export function ChantierStartPanel({
  chantierId,
  minDate,
  date,
  time,
  hint,
}: {
  chantierId: string;
  minDate: string;
  date?: string;
  time: string;
  hint?: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmChantierStart.bind(null, chantierId),
    initialFormState,
  );
  const dateError = state.fieldErrors?.date?.[0];
  const timeError = state.fieldErrors?.time?.[0];
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised sm:px-6">
      <form action={formAction} className="mx-auto flex max-w-3xl flex-col gap-3" noValidate>
        <h2 className="text-sm font-medium">{tf.confirmTitle}</h2>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <label htmlFor="start-date" className="sr-only">
              {tf.startDate}
            </label>
            <Calendar
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="start-date"
              name="date"
              type="date"
              required
              min={minDate}
              defaultValue={state.values?.date ?? date}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? "start-date-error" : undefined}
              onClick={openPicker}
              className={`${inputClasses} ${pickerInput}`}
            />
          </div>
          <div className="relative">
            <label htmlFor="start-time" className="sr-only">
              {tf.startTime}
            </label>
            <Clock
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="start-time"
              name="time"
              type="time"
              required
              step={300}
              defaultValue={state.values?.time ?? time}
              aria-invalid={timeError ? true : undefined}
              aria-describedby={timeError ? "start-time-error" : undefined}
              onClick={openPicker}
              className={`${inputClasses} ${pickerInput}`}
            />
          </div>
        </div>
        {dateError && <FieldError id="start-date-error">{dateError}</FieldError>}
        {timeError && <FieldError id="start-time-error">{timeError}</FieldError>}
        {hint && <Hint>{hint}</Hint>}
        <Button type="submit" size="lg" disabled={pending}>
          {tf.confirm}
        </Button>
      </form>
    </div>
  );
}

/** « Modifier » la date de démarrage, tant que les travaux n'ont pas commencé (client prévenu). */
export function EditChantierStartButton({
  chantierId,
  minDate,
  date,
  time,
}: {
  chantierId: string;
  minDate: string;
  date: string;
  time: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center rounded-md px-2 py-1 text-sm font-medium text-primary-strong hover:underline focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        {tf.editTitle}
      </button>
      <Drawer open={open} onClose={close} title={tf.editTitle} backLabel={t.backToForm}>
        <AppointmentForm
          action={editChantierStart.bind(null, chantierId)}
          submitLabel={tf.editSubmit}
          minDate={minDate}
          defaultDate={date}
          defaultTime={time}
          dateLabel={tf.startDate}
          timeLabel={tf.startTime}
          onSuccess={close}
        />
      </Drawer>
    </>
  );
}

/**
 * F-22 « Déclarer le chantier terminé » (maquette « Ce chantier est-il terminé ? ») : rappel
 * d'ajouter les photos finales, puis le client est invité à réceptionner les travaux.
 */
export function DeclareFinishedButton({
  chantierId,
  clientName,
}: {
  chantierId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(
    declareChantierFinished.bind(null, chantierId),
    initialFormState,
  );
  useActionSuccess(state, close);
  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        {tf.finish}
      </Button>
      <Drawer open={open} onClose={close} title={tf.finishTitle} backLabel={tf.finishClose}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{tf.finishIntro(clientName)}</p>
          <p className="rounded-input bg-primary-softer px-4 py-3 text-sm text-primary-strong">
            <span className="font-medium">{tf.finishImportant}</span> {tf.finishReminder}
          </p>
          <PhotoUpload chantierId={chantierId} label={tf.addPhotos} variant="link" />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Button type="submit" size="lg" disabled={pending}>
            {tf.finish}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
