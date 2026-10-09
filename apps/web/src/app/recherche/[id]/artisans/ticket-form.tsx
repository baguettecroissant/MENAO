"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendProjectToMenao, type TicketState } from "@/lib/project/actions";

const t = fr.search.results.ticket;

/** « Vous ne trouvez pas votre artisan idéal ? » → dossier transmis à l'équipe (F-09). */
export function TicketForm({ projectId, askEmail }: { projectId: string; askEmail: boolean }) {
  const [state, action, pending] = useActionState<TicketState, FormData>(
    sendProjectToMenao.bind(null, projectId),
    {},
  );
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-message" className="font-medium">
          {t.message}
        </label>
        <textarea
          id="ticket-message"
          name="message"
          rows={3}
          maxLength={2000}
          className="rounded-button border border-border bg-surface p-3"
        />
      </div>
      {askEmail && (
        <Field
          id="ticket-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t.email}
          hint={t.emailHint}
        />
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
