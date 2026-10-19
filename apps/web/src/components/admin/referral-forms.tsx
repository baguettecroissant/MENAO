"use client";

import { useActionState } from "react";
import { Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { cancelReferral } from "@/lib/admin/referral-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.referrals;

/** Annulation d'un parrainage en attente (ADR 0143) : motif obligatoire, journalisée. */
export function CancelReferralForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(cancelReferral, initialFormState);
  const error = state.fieldErrors?.reason?.[0];
  const id = `motif-${referralId}`;
  if (state.success) return <p className="text-xs text-muted-foreground">{state.success}</p>;
  return (
    <form action={action} noValidate className="flex flex-col gap-1">
      <input type="hidden" name="referral" value={referralId} />
      <div className="flex items-start gap-2">
        <label htmlFor={id} className="sr-only">
          {t.cancelReason}
        </label>
        <input
          id={id}
          name="reason"
          maxLength={300}
          placeholder={t.cancelReason}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={`${inputClasses} min-h-9 text-sm`}
        />
        <Button type="submit" variant="danger-text" size="sm" block={false} disabled={pending}>
          {t.cancel}
        </Button>
      </div>
      {error && <FieldError id={`${id}-erreur`}>{error}</FieldError>}
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
