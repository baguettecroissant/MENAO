"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { addTicketNote } from "@/lib/admin/ticket-actions";

const t = fr.admin.tickets;

/** Note interne d'un ticket (ADR 0049) : jamais visible du déclarant. */
export function TicketNoteForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(addTicketNote, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  const error = state.fieldErrors?.body?.[0];
  // Note ajoutée : le champ se vide pour la suivante.
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor="ticket-note" className="text-sm font-medium">
        {t.noteLabel}
      </label>
      <textarea
        id="ticket-note"
        name="body"
        rows={2}
        maxLength={2000}
        defaultValue={state.success ? "" : state.values?.body}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "ticket-note-error" : undefined}
        className={`${inputClasses} min-h-16 py-2`}
      />
      {error && <FieldError id="ticket-note-error">{error}</FieldError>}
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {t.addNote}
      </Button>
    </form>
  );
}
