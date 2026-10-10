"use client";

import { TICKET_MESSAGE_MAX_LENGTH } from "@menao/core";
import { useActionState, useCallback, useState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { initialFormState } from "@/lib/auth/form";
import { addTicketMessage } from "@/lib/disputes/actions";
import { useActionSuccess } from "@/lib/use-action-success";

/** Message dans un ticket (F-42), par le déclarant ou par l'équipe MENAO. */
export function TicketReplyForm({
  ticketId,
  label,
  submit,
}: {
  ticketId: string;
  label: string;
  submit: string;
}) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    addTicketMessage.bind(null, ticketId),
    initialFormState,
  );
  const clear = useCallback(() => setBody(""), []);
  useActionSuccess(state, clear);
  const id = `ticket-reply-${ticketId}`;
  const error = state.fieldErrors?.body?.[0];
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name="body"
        rows={3}
        maxLength={TICKET_MESSAGE_MAX_LENGTH}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClasses} min-h-24 py-3`}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <Button type="submit" block={false} disabled={pending} className="self-end">
        {submit}
      </Button>
    </form>
  );
}
