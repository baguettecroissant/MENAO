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
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-input border border-primary px-3 text-sm font-medium text-primary-strong hover:bg-primary-softer disabled:border-border disabled:text-subtle-foreground disabled:hover:bg-transparent ${focusRing}`}
        >
          <Send aria-hidden="true" className="size-3.5" />
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

/** Réglage « Relances automatiques » (ADR 0238) : enregistré dès que la case change. */
export function AutoRemindersForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(setAutoReminders, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="auto"
          defaultChecked={enabled}
          disabled={pending}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="size-5 accent-primary"
        />
        {t.autoLabel}
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
