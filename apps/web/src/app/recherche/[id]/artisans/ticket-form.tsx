"use client";

import { useActionState, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendProjectToMenao, type TicketState } from "@/lib/project/actions";

const t = fr.search.results.ticket;

/** « Vous ne trouvez pas votre artisan idéal ? » → dossier transmis à l'équipe (F-09, maquettes). */
export function TicketBlock({ projectId, askEmail }: { projectId: string; askEmail: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TicketState, FormData>(
    sendProjectToMenao.bind(null, projectId),
    {},
  );
  return (
    <section
      aria-label={t.title}
      className="relative overflow-hidden rounded-card border border-primary/25 bg-[linear-gradient(120deg,#eef2fe_0%,#e4eafd_100%)] p-5 sm:p-6"
    >
      <LogoMark className="pointer-events-none absolute -right-4 -bottom-6 size-28 opacity-30" />
      <div className="relative flex flex-col gap-3">
        <h2 className="text-[1.0625rem] font-medium">{t.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{t.intro}</p>
        {state.success ? (
          <Alert tone="success">{state.success}</Alert>
        ) : !open ? (
          <div>
            <Button type="button" size="sm" block={false} onClick={() => setOpen(true)}>
              {t.submit}
            </Button>
          </div>
        ) : (
          <form action={action} className="flex max-w-xl flex-col gap-4" noValidate>
            {state.error && <Alert tone="error">{state.error}</Alert>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-message" className="text-sm font-medium">
                {t.message}
              </label>
              <textarea
                id="ticket-message"
                name="message"
                rows={3}
                maxLength={2000}
                className="rounded-input border border-border bg-surface p-3 text-[0.9375rem] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
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
                className="bg-surface"
              />
            )}
            <div>
              <Button type="submit" size="sm" block={false} disabled={pending}>
                {t.submit}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
