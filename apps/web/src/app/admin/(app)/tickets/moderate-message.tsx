"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { moderateMessage } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.tickets.reportedMessage;

/** F-40, F-55 : masquer un message signalé (motif obligatoire) ou le rétablir. */
export function ModerateMessage({ messageId, hidden }: { messageId: string; hidden: boolean }) {
  const [state, formAction, pending] = useActionState(moderateMessage, initialFormState);
  const id = `moderation-${messageId}`;
  const error = state.fieldErrors?.reason?.[0];
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="hide" value={hidden ? "false" : "true"} />
      {!hidden && (
        <>
          <label htmlFor={id} className="text-sm font-medium">
            {t.reasonLabel}
          </label>
          <textarea
            id={id}
            name="reason"
            rows={2}
            maxLength={500}
            defaultValue={state.values?.reason}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${inputClasses} min-h-16 py-2`}
          />
          {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </>
      )}
      <Button
        type="submit"
        variant={hidden ? "secondary" : "danger"}
        block={false}
        disabled={pending}
        className="self-start"
      >
        {hidden ? t.restore : t.hide}
      </Button>
    </form>
  );
}
