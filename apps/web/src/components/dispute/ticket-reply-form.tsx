"use client";

import { TICKET_MESSAGE_MAX_LENGTH } from "@menao/core";
import { useActionState, useCallback, useState } from "react";
import { Alert, Button, FieldError, Hint, Select, inputClasses } from "@/components/ui";
import { initialFormState } from "@/lib/auth/form";
import { addTicketMessage } from "@/lib/disputes/actions";
import { useActionSuccess } from "@/lib/use-action-success";

/**
 * Message dans un ticket (F-42), par le déclarant ou par l'équipe MENAO. Back-office : réponses
 * types (ADR 0159) qui préremplissent le message, à relire avant l'envoi.
 */
export function TicketReplyForm({
  ticketId,
  label,
  submit,
  hint,
  templates,
}: {
  ticketId: string;
  label: string;
  submit: string;
  /** Précision sous le champ (back-office : où part la réponse). */
  hint?: string;
  templates?: { label: string; choose: string; items: readonly { label: string; body: string }[] };
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
      {templates && templates.items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-template`} className="text-sm font-medium">
            {templates.label}
          </label>
          <Select
            id={`${id}-template`}
            value=""
            onChange={(e) => {
              const item = templates.items[Number(e.target.value)];
              if (item) setBody(item.body);
            }}
          >
            <option value="">{templates.choose}</option>
            {templates.items.map((item, i) => (
              <option key={item.label} value={i}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name="body"
        rows={templates ? 7 : 3}
        maxLength={TICKET_MESSAGE_MAX_LENGTH}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined
        }
        className={`${inputClasses} min-h-24 py-3`}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && <Hint id={`${id}-hint`}>{hint}</Hint>}
      <Button type="submit" block={false} disabled={pending} className="self-end">
        {submit}
      </Button>
    </form>
  );
}
