"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reactivateArtisan, suspendArtisan } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.suspension;

/**
 * Statut du compte d'un artisan (F-52, ADR 0047) : suspension avec motif transmis à l'artisan, ou
 * levée d'une suspension décidée par l'équipe. Une suspension pour assurance expirée se lève par
 * le renouvellement.
 */
export function SuspensionForm({
  artisanId,
  status,
  suspensionReason,
}: {
  artisanId: string;
  status: string;
  suspensionReason: string | null;
}) {
  const [suspendState, suspend, suspending] = useActionState(suspendArtisan, initialFormState);
  const [reactivateState, reactivate, reactivating] = useActionState(
    reactivateArtisan,
    initialFormState,
  );
  // Après l'action, la page est relue : le message suit le nouveau statut.
  const success = status === "suspendu" ? suspendState.success : reactivateState.success;
  const failure = status === "valide" ? suspendState.error : reactivateState.error;
  const error = suspendState.fieldErrors?.reason?.[0];

  return (
    <div className="flex flex-col gap-3">
      {success && <Alert tone="success">{success}</Alert>}
      {failure && <Alert tone="error">{failure}</Alert>}
      {status === "valide" ? (
        <form action={suspend} noValidate className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t.active}</p>
          <input type="hidden" name="artisanId" value={artisanId} />
          <label htmlFor="suspension-reason" className="text-sm font-medium">
            {t.reasonLabel}
          </label>
          <textarea
            id="suspension-reason"
            name="reason"
            rows={3}
            maxLength={1000}
            defaultValue={suspendState.values?.reason}
            aria-invalid={error ? true : undefined}
            aria-describedby={`suspension-hint${error ? " suspension-error" : ""}`}
            className={`${inputClasses} min-h-20 py-2`}
          />
          <p id="suspension-hint" className="text-xs text-muted-foreground">
            {t.reasonHint}
          </p>
          {error && <FieldError id="suspension-error">{error}</FieldError>}
          <Button
            type="submit"
            variant="danger"
            size="sm"
            block={false}
            disabled={suspending}
            className="self-start"
          >
            {t.suspend}
          </Button>
        </form>
      ) : status === "suspendu" &&
        (suspensionReason === "decision_admin" || suspensionReason === "plaintes") ? (
        <form action={reactivate} className="flex flex-col gap-2">
          <input type="hidden" name="artisanId" value={artisanId} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            block={false}
            disabled={reactivating}
            className="self-start"
          >
            {t.reactivate}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status === "suspendu" ? t.automatic : t.notApplicable}
        </p>
      )}
    </div>
  );
}
