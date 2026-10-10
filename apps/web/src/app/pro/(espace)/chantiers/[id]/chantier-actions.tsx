"use client";

import { NotebookPen, Plus } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { AppointmentForm } from "@/components/pro/appointment-form";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  cancelChantier,
  rescheduleAppointment,
  saveAppointmentNotes,
} from "@/lib/artisan/chantier-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.appointment;

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
        defaultValue={notes ?? ""}
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
