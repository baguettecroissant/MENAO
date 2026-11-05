"use client";

import { CalendarCheck } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { formatDayMonthShort, formatTime } from "@/lib/format";
import { chooseSlot } from "@/lib/project/slot-actions";

const t = fr.myChantiers.slots;

export type SlotProposal = { id: string; artisan: string; slots: string[] };

/**
 * Créneaux proposés par les artisans (ADR 0222), en tête de l'espace client : un toucher fixe le
 * rendez-vous.
 */
export function SlotProposals({ proposals }: { proposals: readonly SlotProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <section aria-labelledby="creneaux-proposes" className="flex flex-col gap-3">
      <h2 id="creneaux-proposes" className="text-lg font-medium">
        {t.title}
      </h2>
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
    </section>
  );
}

function ProposalCard({ proposal }: { proposal: SlotProposal }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-primary/25 bg-primary-soft p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-primary-strong">
        <CalendarCheck aria-hidden="true" className="size-4" />
        {t.from(proposal.artisan)}
      </p>
      <div className="flex flex-wrap gap-2">
        {proposal.slots.map((iso) => (
          <SlotButton key={iso} proposalId={proposal.id} slot={iso} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t.hint}</p>
    </div>
  );
}

function SlotButton({ proposalId, slot }: { proposalId: string; slot: string }) {
  const [state, action, pending] = useActionState(
    chooseSlot.bind(null, proposalId, slot),
    initialFormState,
  );
  return (
    <form action={action} className="flex flex-col gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-pill border border-primary/40 bg-surface px-4 text-sm font-medium text-primary-strong transition hover:border-primary hover:bg-primary-softer disabled:opacity-60"
      >
        {fr.pro.appointment.suggestion(formatDayMonthShort(slot), formatTime(slot))}
      </button>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
