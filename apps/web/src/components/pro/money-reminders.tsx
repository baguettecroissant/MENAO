"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { sendPaymentReminder, setAutoReminders } from "@/lib/artisan/money-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.moneyOverview;

/** « Relancer » un paiement dû (ADR 0238) ; désactivé moins de 3 jours après une relance. */
export function RemindButton({
  chantierId,
  kind,
  allowed,
}: {
  chantierId: string;
  kind: "acompte" | "solde";
  allowed: boolean;
}) {
  const [state, action, pending] = useActionState(sendPaymentReminder, initialFormState);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="chantierId" value={chantierId} />
      <input type="hidden" name="kind" value={kind} />
      {state.success ? (
        <p role="status" className="text-xs text-success">
          {state.success}
        </p>
      ) : (
        <button
          type="submit"
          disabled={pending || !allowed}
          title={allowed ? t.remindHint : t.remindTooSoon}
          className={`inline-flex min-h-10 items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground hover:bg-background disabled:border-border disabled:text-subtle-foreground disabled:hover:bg-surface ${focusRing}`}
        >
          <Send aria-hidden="true" className="size-4" />
          {pending ? t.reminding : t.remind}
        </button>
      )}
      {state.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

/**
 * Réglage « Relances automatiques » (ADR 0238) : interrupteur enregistré dès qu'il change
 * (maquette du lot 37 : à droite du titre de la carte).
 */
export function AutoRemindersForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(setAutoReminders, initialFormState);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          role="switch"
          name="auto"
          defaultChecked={enabled}
          disabled={pending}
          aria-label={t.autoLabel}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-[1.625rem] w-11 rounded-full bg-border-strong transition-colors peer-checked:bg-success peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 peer-disabled:opacity-60"
        />
        <span
          aria-hidden="true"
          className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px] motion-reduce:transition-none"
        />
      </label>
      {state.success && (
        <p role="status" className="text-xs text-success">
          {state.success}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
